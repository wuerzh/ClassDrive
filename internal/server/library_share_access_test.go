package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// createShareForTest 通过教师 API 创建分享，返回 token 与一次性安全码。
func createShareForTest(t *testing.T, app *App, cookie *http.Cookie, entryID int64, permission string, requireCode bool) (token string, accessCode string) {
	t.Helper()
	recorder := shareJSONRequest(t, app, cookie, http.MethodPost, "/api/library-shares", map[string]any{
		"entryId":           entryID,
		"permission":        permission,
		"requireAccessCode": requireCode,
	})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("create share: %d %s", recorder.Code, recorder.Body.String())
	}
	var result map[string]any
	decodeJSON(t, recorder.Body, &result)
	accessCode, _ = result["accessCode"].(string)
	share, _ := result["share"].(map[string]any)
	token, _ = share["token"].(string)
	if token == "" {
		t.Fatalf("expected share token, got %#v", result)
	}
	return token, accessCode
}

// publicRequest 发起免登录请求（可附带分享会话 cookie）。
func publicRequest(t *testing.T, app *App, method, path string, payload any, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	var request *http.Request
	if payload != nil {
		request = httptest.NewRequest(method, path, jsonBody(t, payload))
		request.Header.Set("Content-Type", "application/json")
	} else {
		request = httptest.NewRequest(method, path, nil)
	}
	for _, cookie := range cookies {
		if cookie != nil {
			request.AddCookie(cookie)
		}
	}
	app.ServeHTTP(recorder, request)
	return recorder
}

func TestShareInfoReturnsMetadataAndRequiresCode(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)
	entry, err := app.createFile("library", nil, "/", "信息源.txt", strings.NewReader("正文"))
	if err != nil {
		t.Fatalf("create file: %v", err)
	}
	token, _ := createShareForTest(t, app, cookie, entry.ID, "view", true)

	recorder := publicRequest(t, app, http.MethodGet, "/api/share/"+token, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected info 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	var result map[string]any
	decodeJSON(t, recorder.Body, &result)
	info, _ := result["info"].(map[string]any)
	if requires, _ := info["requiresAccessCode"].(bool); !requires {
		t.Fatalf("expected requiresAccessCode true, got %#v", info)
	}
	if kind, _ := info["entryKind"].(string); kind != "file" {
		t.Fatalf("expected entryKind file, got %#v", info["entryKind"])
	}
	if status, _ := info["status"].(string); status != "active" {
		t.Fatalf("expected status active, got %#v", info["status"])
	}
}

func TestShareVerifyRejectsWrongCodeAndAcceptsCorrect(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)
	entry, err := app.createFile("library", nil, "/", "校验源.txt", strings.NewReader("正文"))
	if err != nil {
		t.Fatalf("create file: %v", err)
	}
	token, accessCode := createShareForTest(t, app, cookie, entry.ID, "view", true)

	wrong := publicRequest(t, app, http.MethodPost, "/api/share/"+token+"/verify", map[string]any{"accessCode": "WRONGX"})
	if wrong.Code != http.StatusForbidden {
		t.Fatalf("expected wrong code 403, got %d: %s", wrong.Code, wrong.Body.String())
	}

	ok := publicRequest(t, app, http.MethodPost, "/api/share/"+token+"/verify", map[string]any{"accessCode": accessCode})
	if ok.Code != http.StatusOK {
		t.Fatalf("expected correct code 200, got %d: %s", ok.Code, ok.Body.String())
	}
	if findCookie(t, ok.Result().Cookies(), "classdrive_share_session") == nil {
		t.Fatalf("expected share session cookie after verify")
	}
}

func TestShareContentRequiresVerificationForCodeShare(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)
	entry, err := app.createFile("library", nil, "/", "内容源.txt", strings.NewReader("正文内容"))
	if err != nil {
		t.Fatalf("create file: %v", err)
	}
	token, accessCode := createShareForTest(t, app, cookie, entry.ID, "view", true)

	previewPath := "/api/share/" + token + "/files/" + itoa(entry.ID) + "/preview"
	blocked := publicRequest(t, app, http.MethodGet, previewPath, nil)
	if blocked.Code != http.StatusUnauthorized && blocked.Code != http.StatusForbidden {
		t.Fatalf("expected unverified preview blocked, got %d: %s", blocked.Code, blocked.Body.String())
	}

	verify := publicRequest(t, app, http.MethodPost, "/api/share/"+token+"/verify", map[string]any{"accessCode": accessCode})
	session := findCookie(t, verify.Result().Cookies(), "classdrive_share_session")
	if session == nil {
		t.Fatalf("missing share session cookie")
	}

	allowed := publicRequest(t, app, http.MethodGet, previewPath, nil, session)
	if allowed.Code != http.StatusOK {
		t.Fatalf("expected verified preview 200, got %d: %s", allowed.Code, allowed.Body.String())
	}
	if !strings.Contains(allowed.Body.String(), "正文内容") {
		t.Fatalf("expected file body in preview, got %q", allowed.Body.String())
	}
}

func TestShareNoCodeAllowsContentWithoutVerify(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)
	entry, err := app.createFile("library", nil, "/", "免码内容.txt", strings.NewReader("免码正文"))
	if err != nil {
		t.Fatalf("create file: %v", err)
	}
	token, _ := createShareForTest(t, app, cookie, entry.ID, "view", false)

	preview := publicRequest(t, app, http.MethodGet, "/api/share/"+token+"/files/"+itoa(entry.ID)+"/preview", nil)
	if preview.Code != http.StatusOK {
		t.Fatalf("expected no-code preview 200, got %d: %s", preview.Code, preview.Body.String())
	}
}

func TestShareDownloadRespectsPermission(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)
	entry, err := app.createFile("library", nil, "/", "下载源.txt", strings.NewReader("下载正文"))
	if err != nil {
		t.Fatalf("create file: %v", err)
	}

	viewToken, _ := createShareForTest(t, app, cookie, entry.ID, "view", false)
	viewDownload := publicRequest(t, app, http.MethodGet, "/api/share/"+viewToken+"/files/"+itoa(entry.ID)+"/download", nil)
	if viewDownload.Code != http.StatusForbidden {
		t.Fatalf("expected view-only download 403, got %d: %s", viewDownload.Code, viewDownload.Body.String())
	}

	downloadToken, _ := createShareForTest(t, app, cookie, entry.ID, "download", false)
	allowed := publicRequest(t, app, http.MethodGet, "/api/share/"+downloadToken+"/files/"+itoa(entry.ID)+"/download", nil)
	if allowed.Code != http.StatusOK {
		t.Fatalf("expected download permission 200, got %d: %s", allowed.Code, allowed.Body.String())
	}
}

func TestShareFolderScopingBlocksNonDescendant(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	folder, err := app.createFolder("library", nil, "/", "分享夹")
	if err != nil {
		t.Fatalf("create folder: %v", err)
	}
	inner, err := app.createFile("library", nil, "/分享夹", "内部.txt", strings.NewReader("内部正文"))
	if err != nil {
		t.Fatalf("create inner file: %v", err)
	}
	outside, err := app.createFile("library", nil, "/", "外部.txt", strings.NewReader("外部正文"))
	if err != nil {
		t.Fatalf("create outside file: %v", err)
	}

	token, _ := createShareForTest(t, app, cookie, folder.ID, "download", false)

	insideRec := publicRequest(t, app, http.MethodGet, "/api/share/"+token+"/files/"+itoa(inner.ID)+"/preview", nil)
	if insideRec.Code != http.StatusOK {
		t.Fatalf("expected descendant preview 200, got %d: %s", insideRec.Code, insideRec.Body.String())
	}

	outsideRec := publicRequest(t, app, http.MethodGet, "/api/share/"+token+"/files/"+itoa(outside.ID)+"/preview", nil)
	if outsideRec.Code != http.StatusForbidden && outsideRec.Code != http.StatusNotFound {
		t.Fatalf("expected non-descendant blocked, got %d: %s", outsideRec.Code, outsideRec.Body.String())
	}
}

func TestShareRejectsDisabledExpiredAndDeletedEntry(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	// disabled
	disabledEntry, _ := app.createFile("library", nil, "/", "停用源.txt", strings.NewReader("正文"))
	disabledToken, _ := createShareForTest(t, app, cookie, disabledEntry.ID, "view", false)
	disableRec := shareJSONRequest(t, app, cookie, http.MethodPatch, "/api/library-shares/"+shareIDFromToken(t, app, cookie, disabledToken), map[string]any{"disabled": true})
	if disableRec.Code != http.StatusOK {
		t.Fatalf("disable share: %d %s", disableRec.Code, disableRec.Body.String())
	}
	if rec := publicRequest(t, app, http.MethodGet, "/api/share/"+disabledToken, nil); rec.Code == http.StatusOK {
		t.Fatalf("expected disabled share info blocked, got 200")
	}

	// expired
	expiredEntry, _ := app.createFile("library", nil, "/", "过期源.txt", strings.NewReader("正文"))
	expiredToken, _ := createShareForTest(t, app, cookie, expiredEntry.ID, "view", false)
	past := time.Now().Add(-1 * time.Hour).UTC().Format(time.RFC3339)
	expireRec := shareJSONRequest(t, app, cookie, http.MethodPatch, "/api/library-shares/"+shareIDFromToken(t, app, cookie, expiredToken), map[string]any{"expiresAt": past})
	if expireRec.Code != http.StatusOK {
		t.Fatalf("expire share: %d %s", expireRec.Code, expireRec.Body.String())
	}
	if rec := publicRequest(t, app, http.MethodGet, "/api/share/"+expiredToken, nil); rec.Code == http.StatusOK {
		t.Fatalf("expected expired share info blocked, got 200")
	}

	// deleted entry
	deletedEntry, _ := app.createFile("library", nil, "/", "删源.txt", strings.NewReader("正文"))
	deletedToken, _ := createShareForTest(t, app, cookie, deletedEntry.ID, "view", false)
	if err := app.deleteEntry(deletedEntry.ID); err != nil {
		t.Fatalf("delete entry: %v", err)
	}
	if rec := publicRequest(t, app, http.MethodGet, "/api/share/"+deletedToken, nil); rec.Code == http.StatusOK {
		t.Fatalf("expected deleted-entry share info blocked, got 200")
	}
}

func TestShareVerifyCooldownAfterRepeatedFailures(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)
	entry, _ := app.createFile("library", nil, "/", "爆破源.txt", strings.NewReader("正文"))
	token, _ := createShareForTest(t, app, cookie, entry.ID, "view", true)

	for i := 0; i < shareMaxFailedAttempts; i++ {
		rec := publicRequest(t, app, http.MethodPost, "/api/share/"+token+"/verify", map[string]any{"accessCode": "BADXYZ"})
		if rec.Code != http.StatusForbidden {
			t.Fatalf("attempt %d expected 403, got %d: %s", i, rec.Code, rec.Body.String())
		}
	}
	locked := publicRequest(t, app, http.MethodPost, "/api/share/"+token+"/verify", map[string]any{"accessCode": "BADXYZ"})
	if locked.Code != http.StatusTooManyRequests {
		t.Fatalf("expected cooldown 429 after %d failures, got %d: %s", shareMaxFailedAttempts, locked.Code, locked.Body.String())
	}
}

func TestShareFolderBrowseListsChildren(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	folder, err := app.createFolder("library", nil, "/", "浏览夹")
	if err != nil {
		t.Fatalf("create folder: %v", err)
	}
	if _, err := app.createFile("library", nil, "/浏览夹", "子文件.txt", strings.NewReader("子正文")); err != nil {
		t.Fatalf("create inner file: %v", err)
	}
	token, _ := createShareForTest(t, app, cookie, folder.ID, "view", false)

	recorder := publicRequest(t, app, http.MethodGet, "/api/share/"+token+"/items?path=/", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected items 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	var result map[string]any
	decodeJSON(t, recorder.Body, &result)
	items, ok := result["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected 1 item, got %#v", result["items"])
	}
	first, _ := items[0].(map[string]any)
	if name, _ := first["name"].(string); name != "子文件.txt" {
		t.Fatalf("expected child 子文件.txt, got %#v", first["name"])
	}
	if previewURL, _ := first["previewUrl"].(string); !strings.Contains(previewURL, "/api/share/"+token+"/files/") {
		t.Fatalf("expected scoped preview url, got %#v", first["previewUrl"])
	}
}

// shareIDFromToken 通过教师列表反查指定 token 的分享 id（仅测试辅助）。
func shareIDFromToken(t *testing.T, app *App, cookie *http.Cookie, token string) string {
	t.Helper()
	recorder := shareJSONRequest(t, app, cookie, http.MethodGet, "/api/library-shares", nil)
	var result map[string]any
	decodeJSON(t, recorder.Body, &result)
	shares, _ := result["shares"].([]any)
	for _, raw := range shares {
		share, _ := raw.(map[string]any)
		if tok, _ := share["token"].(string); tok == token {
			return itoa(int64(share["id"].(float64)))
		}
	}
	t.Fatalf("share with token %s not found", token)
	return ""
}
