package server

import (
	"database/sql"
	"net/http"
	"testing"
)

func TestSystemSettingsExposeAndUpdateDefaultShareExpiresDays(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)
	cookie := loginAndGetCookie(t, app)

	getRec := shareJSONRequest(t, app, cookie, http.MethodGet, "/api/settings/system", nil)
	if getRec.Code != http.StatusOK {
		t.Fatalf("expected settings 200, got %d: %s", getRec.Code, getRec.Body.String())
	}
	var initial map[string]any
	decodeJSON(t, getRec.Body, &initial)
	settings, _ := initial["settings"].(map[string]any)
	if days, _ := settings["defaultShareExpiresDays"].(float64); days != 7 {
		t.Fatalf("expected default 7, got %#v", settings["defaultShareExpiresDays"])
	}

	patchRec := shareJSONRequest(t, app, cookie, http.MethodPatch, "/api/settings/system", map[string]any{
		"uploadPanelEnabled":      true,
		"serverPort":              "80",
		"defaultShareExpiresDays": 30,
	})
	if patchRec.Code != http.StatusOK {
		t.Fatalf("expected patch 200, got %d: %s", patchRec.Code, patchRec.Body.String())
	}
	var updated map[string]any
	decodeJSON(t, patchRec.Body, &updated)
	updatedSettings, _ := updated["settings"].(map[string]any)
	if days, _ := updatedSettings["defaultShareExpiresDays"].(float64); days != 30 {
		t.Fatalf("expected updated 30, got %#v", updatedSettings["defaultShareExpiresDays"])
	}

	reloadRec := shareJSONRequest(t, app, cookie, http.MethodGet, "/api/settings/system", nil)
	var reloaded map[string]any
	decodeJSON(t, reloadRec.Body, &reloaded)
	reloadedSettings, _ := reloaded["settings"].(map[string]any)
	if days, _ := reloadedSettings["defaultShareExpiresDays"].(float64); days != 30 {
		t.Fatalf("expected persisted 30, got %#v", reloadedSettings["defaultShareExpiresDays"])
	}
}

// TestSystemSettingsMigrationAddsShareExpiresColumn 模拟老库（缺列），确认迁移补列且默认 7。
func TestSystemSettingsMigrationAddsShareExpiresColumn(t *testing.T) {
	t.Parallel()
	_, app := newTestServer(t)

	// 还原成不含 default_share_expires_days 的旧表结构。
	if _, err := app.db.Exec(`drop table if exists system_settings`); err != nil {
		t.Fatalf("drop: %v", err)
	}
	if _, err := app.db.Exec(`create table system_settings (
  id integer primary key check (id = 1),
  upload_panel_enabled integer not null default 1,
  single_account_login_enabled integer not null default 1,
  server_port text not null default '80'
)`); err != nil {
		t.Fatalf("recreate old table: %v", err)
	}
	if _, err := app.db.Exec(`insert into system_settings (id, upload_panel_enabled, single_account_login_enabled, server_port) values (1, 1, 1, '80')`); err != nil {
		t.Fatalf("seed old row: %v", err)
	}

	if err := app.migrateSystemSettingsTable(); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	var days sql.NullInt64
	if err := app.db.QueryRow(`select default_share_expires_days from system_settings where id = 1`).Scan(&days); err != nil {
		t.Fatalf("expected default_share_expires_days column after migration: %v", err)
	}
	if !days.Valid || days.Int64 != 7 {
		t.Fatalf("expected migrated default 7, got %#v", days)
	}
}
