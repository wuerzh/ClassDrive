package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// shareJSONRequest 发起一个携带教师会话的 JSON 请求，返回 recorder。
func shareJSONRequest(t *testing.T, app *App, cookie *http.Cookie, method, path string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	var recorder = httptest.NewRecorder()
	var request *http.Request
	if payload != nil {
		request = httptest.NewRequest(method, path, jsonBody(t, payload))
		request.Header.Set("Content-Type", "application/json")
	} else {
		request = httptest.NewRequest(method, path, nil)
	}
	if cookie != nil {
		request.AddCookie(cookie)
	}
	app.ServeHTTP(recorder, request)
	return recorder
}

func TestLibraryShareCreateForLibraryFileReturnsOneTimeAccessCode(t *testing.T) {
	t.Parallel()

	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	entry, err := app.createFile("library", nil, "/", "分享源.txt", strings.NewReader("分享正文"))
	if err != nil {
		t.Fatalf("create library file: %v", err)
	}

	recorder := shareJSONRequest(t, app, cookie, http.MethodPost, "/api/library-shares", map[string]any{
		"entryId":           entry.ID,
		"permission":        "view",
		"requireAccessCode": true,
		"expiresAt":         "",
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var result map[string]any
	decodeJSON(t, recorder.Body, &result)

	accessCode, _ := result["accessCode"].(string)
	if accessCode == "" {
		t.Fatalf("expected non-empty one-time access code, got %#v", result["accessCode"])
	}

	share, ok := result["share"].(map[string]any)
	if !ok {
		t.Fatalf("expected share object, got %#v", result["share"])
	}
	if token, _ := share["token"].(string); len(token) < 32 {
		t.Fatalf("expected long random token, got %#v", share["token"])
	}
	if permission, _ := share["permission"].(string); permission != "view" {
		t.Fatalf("expected permission view, got %#v", share["permission"])
	}
	if requires, _ := share["requiresAccessCode"].(bool); !requires {
		t.Fatalf("expected requiresAccessCode true")
	}
	if name, _ := share["entryName"].(string); name != "分享源.txt" {
		t.Fatalf("expected entryName 分享源.txt, got %#v", share["entryName"])
	}
	if kind, _ := share["entryKind"].(string); kind != "file" {
		t.Fatalf("expected entryKind file, got %#v", share["entryKind"])
	}
	if status, _ := share["status"].(string); status != "active" {
		t.Fatalf("expected status active, got %#v", share["status"])
	}
}

func TestLibraryShareCreateRejectsNonLibraryEntry(t *testing.T) {
	t.Parallel()

	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	publicEntry, err := app.createFile("public", nil, "/", "公共源.txt", strings.NewReader("公共正文"))
	if err != nil {
		t.Fatalf("create public file: %v", err)
	}

	recorder := shareJSONRequest(t, app, cookie, http.MethodPost, "/api/library-shares", map[string]any{
		"entryId":           publicEntry.ID,
		"permission":        "view",
		"requireAccessCode": true,
	})
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for non-library entry, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

func TestLibraryShareCreateWithoutAccessCodeReturnsEmptyCode(t *testing.T) {
	t.Parallel()

	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	entry, err := app.createFile("library", nil, "/", "免码源.txt", strings.NewReader("免码正文"))
	if err != nil {
		t.Fatalf("create library file: %v", err)
	}

	recorder := shareJSONRequest(t, app, cookie, http.MethodPost, "/api/library-shares", map[string]any{
		"entryId":           entry.ID,
		"permission":        "download",
		"requireAccessCode": false,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var result map[string]any
	decodeJSON(t, recorder.Body, &result)
	if accessCode, _ := result["accessCode"].(string); accessCode != "" {
		t.Fatalf("expected empty access code for no-code share, got %#v", result["accessCode"])
	}
	share, _ := result["share"].(map[string]any)
	if requires, _ := share["requiresAccessCode"].(bool); requires {
		t.Fatalf("expected requiresAccessCode false")
	}
}

func TestLibraryShareListReflectsCreatedShares(t *testing.T) {
	t.Parallel()

	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	for i, name := range []string{"列表源一.txt", "列表源二.txt"} {
		entry, err := app.createFile("library", nil, "/", name, strings.NewReader("正文"))
		if err != nil {
			t.Fatalf("create library file %d: %v", i, err)
		}
		recorder := shareJSONRequest(t, app, cookie, http.MethodPost, "/api/library-shares", map[string]any{
			"entryId":           entry.ID,
			"permission":        "view",
			"requireAccessCode": true,
		})
		if recorder.Code != http.StatusCreated {
			t.Fatalf("create share %d: %d %s", i, recorder.Code, recorder.Body.String())
		}
	}

	recorder := shareJSONRequest(t, app, cookie, http.MethodGet, "/api/library-shares", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected list 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	var result map[string]any
	decodeJSON(t, recorder.Body, &result)
	shares, ok := result["shares"].([]any)
	if !ok || len(shares) != 2 {
		t.Fatalf("expected 2 shares, got %#v", result["shares"])
	}
}

func TestLibraryShareUpdateChangesPermissionAndDisabled(t *testing.T) {
	t.Parallel()

	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	entry, err := app.createFile("library", nil, "/", "更新源.txt", strings.NewReader("正文"))
	if err != nil {
		t.Fatalf("create library file: %v", err)
	}
	createRec := shareJSONRequest(t, app, cookie, http.MethodPost, "/api/library-shares", map[string]any{
		"entryId":           entry.ID,
		"permission":        "view",
		"requireAccessCode": true,
	})
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create share: %d %s", createRec.Code, createRec.Body.String())
	}
	var created map[string]any
	decodeJSON(t, createRec.Body, &created)
	share, _ := created["share"].(map[string]any)
	shareID := int64(share["id"].(float64))

	updateRec := shareJSONRequest(t, app, cookie, http.MethodPatch, "/api/library-shares/"+itoa(shareID), map[string]any{
		"permission": "download",
		"disabled":   true,
	})
	if updateRec.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d: %s", updateRec.Code, updateRec.Body.String())
	}
	var updated map[string]any
	decodeJSON(t, updateRec.Body, &updated)
	updatedShare, _ := updated["share"].(map[string]any)
	if permission, _ := updatedShare["permission"].(string); permission != "download" {
		t.Fatalf("expected permission download, got %#v", updatedShare["permission"])
	}
	if disabled, _ := updatedShare["disabled"].(bool); !disabled {
		t.Fatalf("expected disabled true")
	}
	if status, _ := updatedShare["status"].(string); status != "disabled" {
		t.Fatalf("expected status disabled, got %#v", updatedShare["status"])
	}
}

func TestLibraryShareDeleteRemovesShare(t *testing.T) {
	t.Parallel()

	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	entry, err := app.createFile("library", nil, "/", "删除源.txt", strings.NewReader("正文"))
	if err != nil {
		t.Fatalf("create library file: %v", err)
	}
	createRec := shareJSONRequest(t, app, cookie, http.MethodPost, "/api/library-shares", map[string]any{
		"entryId":           entry.ID,
		"permission":        "view",
		"requireAccessCode": true,
	})
	var created map[string]any
	decodeJSON(t, createRec.Body, &created)
	share, _ := created["share"].(map[string]any)
	shareID := int64(share["id"].(float64))

	deleteRec := shareJSONRequest(t, app, cookie, http.MethodDelete, "/api/library-shares/"+itoa(shareID), nil)
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("expected delete 200, got %d: %s", deleteRec.Code, deleteRec.Body.String())
	}

	listRec := shareJSONRequest(t, app, cookie, http.MethodGet, "/api/library-shares", nil)
	var listResult map[string]any
	decodeJSON(t, listRec.Body, &listResult)
	if shares, _ := listResult["shares"].([]any); len(shares) != 0 {
		t.Fatalf("expected 0 shares after delete, got %#v", listResult["shares"])
	}
}

func TestLibraryShareResetCodeReturnsNewAccessCode(t *testing.T) {
	t.Parallel()

	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	entry, err := app.createFile("library", nil, "/", "重置源.txt", strings.NewReader("正文"))
	if err != nil {
		t.Fatalf("create library file: %v", err)
	}
	createRec := shareJSONRequest(t, app, cookie, http.MethodPost, "/api/library-shares", map[string]any{
		"entryId":           entry.ID,
		"permission":        "view",
		"requireAccessCode": true,
	})
	var created map[string]any
	decodeJSON(t, createRec.Body, &created)
	share, _ := created["share"].(map[string]any)
	shareID := int64(share["id"].(float64))

	resetRec := shareJSONRequest(t, app, cookie, http.MethodPost, "/api/library-shares/"+itoa(shareID)+"/reset-code", nil)
	if resetRec.Code != http.StatusOK {
		t.Fatalf("expected reset 200, got %d: %s", resetRec.Code, resetRec.Body.String())
	}
	var reset map[string]any
	decodeJSON(t, resetRec.Body, &reset)
	if accessCode, _ := reset["accessCode"].(string); accessCode == "" {
		t.Fatalf("expected new non-empty access code, got %#v", reset["accessCode"])
	}
	resetShare, _ := reset["share"].(map[string]any)
	if requires, _ := resetShare["requiresAccessCode"].(bool); !requires {
		t.Fatalf("expected requiresAccessCode true after reset")
	}
}
