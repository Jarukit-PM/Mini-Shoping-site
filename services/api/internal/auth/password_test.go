package auth

import (
	"testing"
)

func TestHashPassword_ComparePassword(t *testing.T) {
	hash, err := HashPassword("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if len(hash) == 0 {
		t.Fatal("expected non-empty hash")
	}
	if err := ComparePassword(hash, "correct-horse-battery-staple"); err != nil {
		t.Fatalf("ComparePassword same plain: %v", err)
	}
	if err := ComparePassword(hash, "wrong"); err == nil {
		t.Fatal("expected mismatch error")
	}
}

func TestComparePassword_invalidHash(t *testing.T) {
	err := ComparePassword([]byte("not-a-bcrypt-hash"), "x")
	if err == nil {
		t.Fatal("expected error for invalid hash")
	}
}
