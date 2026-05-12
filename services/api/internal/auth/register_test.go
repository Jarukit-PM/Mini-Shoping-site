package auth

import (
	"strings"
	"testing"
)

func TestValidateSignupEmail(t *testing.T) {
	t.Run("normalizes and accepts", func(t *testing.T) {
		e, ok := validateSignupEmail("  User@Example.COM ")
		if !ok || e != "user@example.com" {
			t.Fatalf("got %q ok=%v", e, ok)
		}
	})
	t.Run("rejects empty", func(t *testing.T) {
		if _, ok := validateSignupEmail("   "); ok {
			t.Fatal("expected !ok")
		}
	})
	t.Run("rejects without at", func(t *testing.T) {
		if _, ok := validateSignupEmail("notanemail"); ok {
			t.Fatal("expected !ok")
		}
	})
}

func TestValidateSignupPassword(t *testing.T) {
	if msg := validateSignupPassword("short"); msg == "" {
		t.Fatal("expected error for short password")
	}
	if msg := validateSignupPassword("12345678"); msg != "" {
		t.Fatalf("unexpected: %q", msg)
	}
	if msg := validateSignupPassword(strings.Repeat("a", 73)); msg == "" {
		t.Fatal("expected error for long password")
	}
}
