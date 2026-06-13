package main

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDefaultPortIs80(t *testing.T) {
	if defaultPort() != "80" {
		t.Fatalf("defaultPort() = %q, want %q", defaultPort(), "80")
	}
}

func TestConfiguredPortReadsSavedSystemSetting(t *testing.T) {
	baseDir := t.TempDir()
	dbDir := filepath.Join(baseDir, "var", "data")
	if err := os.MkdirAll(dbDir, 0o755); err != nil {
		t.Fatalf("mkdir db dir: %v", err)
	}
	db, err := sql.Open("sqlite", filepath.Join(dbDir, "classdrive.db"))
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if _, err := db.Exec(`
create table system_settings (
  id integer primary key check (id = 1),
  upload_panel_enabled integer not null default 1,
  server_port text not null default '80'
);
insert into system_settings (id, upload_panel_enabled, server_port) values (1, 1, '777');
`); err != nil {
		t.Fatalf("seed system settings: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close sqlite db: %v", err)
	}

	if got := configuredPort(baseDir); got != "777" {
		t.Fatalf("configuredPort() = %q, want %q", got, "777")
	}
}

func TestStartupURLUsesHostAndPort(t *testing.T) {
	got := startupURL("192.168.1.23", "777")
	want := "http://192.168.1.23:777/"

	if got != want {
		t.Fatalf("startupURL() = %q, want %q", got, want)
	}
}

func TestStartupURLHidesDefaultHTTPPort(t *testing.T) {
	got := startupURL("192.168.1.23", "80")
	want := "http://192.168.1.23/"

	if got != want {
		t.Fatalf("startupURL() = %q, want %q", got, want)
	}
}

func TestListenErrorMessageGuidesCustomPortForDefaultPort(t *testing.T) {
	got := listenErrorMessage("80", errors.New("listen tcp :80: bind: address already in use"))
	if !strings.Contains(got, "80 端口已被占用") || !strings.Contains(got, "自定义访问端口") {
		t.Fatalf("listenErrorMessage() = %q, want custom-port guidance", got)
	}
}

func TestStartupCredentialsMessageShowsDefaultAdminAccount(t *testing.T) {
	got := startupCredentialsMessage()
	if !strings.Contains(got, "admin") || !strings.Contains(got, "demo123") {
		t.Fatalf("startupCredentialsMessage() = %q, want default admin credentials", got)
	}
}

func TestStartupCredentialsMessageHidesOverriddenDefaultPassword(t *testing.T) {
	t.Setenv("CLASSDRIVE_DEFAULT_TEACHER_PASSWORD", "admin987")

	got := startupCredentialsMessage()
	if !strings.Contains(got, "admin") || !strings.Contains(got, "CLASSDRIVE_DEFAULT_TEACHER_PASSWORD") {
		t.Fatalf("startupCredentialsMessage() = %q, want env override guidance", got)
	}
	if strings.Contains(got, "admin987") || strings.Contains(got, "demo123") {
		t.Fatalf("startupCredentialsMessage() = %q, want no concrete password when overridden", got)
	}
}

func TestStartupHostUsesDetectedIP(t *testing.T) {
	got := startupHost(func() (string, bool) {
		return "192.168.1.23", true
	})

	if got != "192.168.1.23" {
		t.Fatalf("startupHost() = %q, want %q", got, "192.168.1.23")
	}
}

func TestStartupHostFallsBackToLoopback(t *testing.T) {
	got := startupHost(func() (string, bool) {
		return "", false
	})

	if got != "127.0.0.1" {
		t.Fatalf("startupHost() = %q, want %q", got, "127.0.0.1")
	}
}
