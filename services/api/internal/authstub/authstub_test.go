package authstub

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestUserID_missing(t *testing.T) {
	if got := UserID(context.Background()); got != primitive.NilObjectID {
		t.Fatalf("expected nil OID, got %v", got)
	}
}

func TestRequireAuth_setsUserID(t *testing.T) {
	var seen primitive.ObjectID
	h := RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = UserID(r.Context())
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if seen == primitive.NilObjectID {
		t.Fatal("expected stub user id in context")
	}
}

func TestRequireAuth_headerOverride(t *testing.T) {
	custom := primitive.NewObjectID()
	var seen primitive.ObjectID
	h := RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = UserID(r.Context())
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Stub-User-Id", custom.Hex())
	h.ServeHTTP(httptest.NewRecorder(), req)
	if seen != custom {
		t.Fatalf("got %v want %v", seen, custom)
	}
}
