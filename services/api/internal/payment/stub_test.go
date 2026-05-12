package payment

import (
	"strings"
	"testing"
)

func TestCharge_empty(t *testing.T) {
	_, err := Charge("", 100)
	if err == nil {
		t.Fatal("expected error for empty card")
	}
}

func TestCharge_4242_succeeds(t *testing.T) {
	r, err := Charge("4242 4242 4242 4242", 500)
	if err != nil {
		t.Fatal(err)
	}
	if !r.OK || r.Ref == "" || !strings.HasPrefix(r.Ref, "stub_") {
		t.Fatalf("unexpected result: %+v", r)
	}
}

func TestCharge_declineTestCard(t *testing.T) {
	r, err := Charge("4000000000000002", 100)
	if err != nil {
		t.Fatal(err)
	}
	if r.OK {
		t.Fatal("expected decline")
	}
	if r.DeclineReason != "card_declined" {
		t.Fatalf("reason %q", r.DeclineReason)
	}
}

func TestCharge_otherNonEmptySucceeds(t *testing.T) {
	r, err := Charge("9999", 1)
	if err != nil {
		t.Fatal(err)
	}
	if !r.OK {
		t.Fatalf("expected OK: %+v", r)
	}
}
