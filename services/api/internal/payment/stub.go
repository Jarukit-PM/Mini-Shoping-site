package payment

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
)

// Result is the outcome of a card charge against the stub processor.
type Result struct {
	OK            bool
	Ref           string
	DeclineReason string
}

// Charge models UC-05 / UC-05 6a: Stripe-style test cards without a real gateway.
// - Card numbers starting with 4242… succeed.
// - 4000000000000002 declines (402 path in handlers).
// - Any other non-empty card succeeds (happy path for demos).
func Charge(cardNumber string, amountCents int64) (Result, error) {
	digits := strings.ReplaceAll(strings.TrimSpace(cardNumber), " ", "")
	if digits == "" {
		return Result{OK: false, DeclineReason: "invalid_card"}, fmt.Errorf("empty card number")
	}
	if strings.HasPrefix(digits, "4242") {
		return Result{OK: true, Ref: "stub_" + randomRef()}, nil
	}
	if strings.HasPrefix(digits, "4000000000000002") && len(digits) >= 16 {
		return Result{OK: false, DeclineReason: "card_declined"}, nil
	}
	return Result{OK: true, Ref: "stub_" + randomRef()}, nil
}

func randomRef() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
