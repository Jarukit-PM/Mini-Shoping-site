package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWriteError(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, http.StatusTeapot, "x_code", "x_msg")
	res := rec.Result()
	if res.StatusCode != http.StatusTeapot {
		t.Fatalf("status %d", res.StatusCode)
	}
	if ct := res.Header.Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type %q", ct)
	}
	var env ErrorEnvelope
	if err := json.NewDecoder(res.Body).Decode(&env); err != nil {
		t.Fatal(err)
	}
	if env.Error.Code != "x_code" || env.Error.Message != "x_msg" {
		t.Fatalf("unexpected body: %+v", env.Error)
	}
}

func TestWriteErrorFields(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteErrorFields(rec, 400, "validation", "bad", map[string]string{"email": "invalid"})
	var env ErrorEnvelope
	_ = json.NewDecoder(rec.Result().Body).Decode(&env)
	if env.Error.Fields["email"] != "invalid" {
		t.Fatalf("fields: %+v", env.Error.Fields)
	}
}

func TestWriteErrorDetails(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteErrorDetails(rec, 409, "out_of_stock", "nope", []string{"a", "b"})
	var env ErrorEnvelope
	_ = json.NewDecoder(rec.Result().Body).Decode(&env)
	if len(env.Error.Details) != 2 || env.Error.Details[0] != "a" {
		t.Fatalf("details: %#v", env.Error.Details)
	}
}

func TestWriteJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteJSON(rec, 201, map[string]int{"n": 1})
	var m map[string]int
	_ = json.NewDecoder(rec.Result().Body).Decode(&m)
	if m["n"] != 1 {
		t.Fatalf("body: %#v", m)
	}
}
