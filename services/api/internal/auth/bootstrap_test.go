package auth

import (
	"context"
	"testing"
)

func TestAdminEnvCredentials(t *testing.T) {
	t.Run("not ok when both unset", func(t *testing.T) {
		t.Setenv("ADMIN_EMAIL", "")
		t.Setenv("ADMIN_PASSWORD", "")
		e, p, ok := adminEnvCredentials()
		if ok {
			t.Fatal("expected !ok")
		}
		if e != "" || p != "" {
			t.Fatalf("want empty strings, got email=%q pass=%q", e, p)
		}
	})

	t.Run("not ok when email missing", func(t *testing.T) {
		t.Setenv("ADMIN_EMAIL", "   ")
		t.Setenv("ADMIN_PASSWORD", "secret")
		_, _, ok := adminEnvCredentials()
		if ok {
			t.Fatal("expected !ok when email whitespace-only")
		}
	})

	t.Run("not ok when password missing", func(t *testing.T) {
		t.Setenv("ADMIN_EMAIL", "admin@example.com")
		t.Setenv("ADMIN_PASSWORD", "")
		_, _, ok := adminEnvCredentials()
		if ok {
			t.Fatal("expected !ok when password empty")
		}
	})

	t.Run("lowercases and trims email, trims password", func(t *testing.T) {
		t.Setenv("ADMIN_EMAIL", "  Admin@Example.COM \t")
		t.Setenv("ADMIN_PASSWORD", "  changeme  ")
		e, p, ok := adminEnvCredentials()
		if !ok {
			t.Fatal("expected ok")
		}
		if e != "admin@example.com" {
			t.Fatalf("email: got %q", e)
		}
		if p != "changeme" {
			t.Fatalf("password: got %q", p)
		}
	})

	t.Run("matches .env.example style defaults", func(t *testing.T) {
		t.Setenv("ADMIN_EMAIL", "admin@example.com")
		t.Setenv("ADMIN_PASSWORD", "changeme")
		e, p, ok := adminEnvCredentials()
		if !ok {
			t.Fatal("expected ok")
		}
		if e != "admin@example.com" || p != "changeme" {
			t.Fatalf("got email=%q pass=%q", e, p)
		}
	})
}

func TestSyncAdminPasswordFromEnv_skipsWithoutDatabaseInProduction(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("ADMIN_EMAIL", "admin@example.com")
	t.Setenv("ADMIN_PASSWORD", "changeme")
	// No Mongo: path returns before touching db.
	if err := SyncAdminPasswordFromEnv(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
}

func TestSyncAdminPasswordFromEnv_skipsWithoutDatabaseWhenCredsMissing(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("ADMIN_EMAIL", "")
	t.Setenv("ADMIN_PASSWORD", "")
	if err := SyncAdminPasswordFromEnv(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
}
