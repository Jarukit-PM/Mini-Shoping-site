package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// testMongoDB returns an isolated database; skips if MongoDB is unreachable.
func testMongoDB(t *testing.T) *mongo.Database {
	t.Helper()
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = "mongodb://127.0.0.1:27017"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Skipf("mongo connect: %v", err)
	}
	t.Cleanup(func() {
		_ = client.Disconnect(context.Background())
	})
	pingCtx, pingCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer pingCancel()
	if err := client.Ping(pingCtx, nil); err != nil {
		t.Skipf("mongo ping: %v", err)
	}
	db := client.Database("mini_shop_test_auth_" + primitive.NewObjectID().Hex())
	t.Cleanup(func() {
		_ = db.Drop(context.Background())
	})
	seedCtx, seedCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer seedCancel()
	if err := EnsureUserIndexes(seedCtx, db); err != nil {
		t.Fatal(err)
	}
	if err := EnsureSessionIndexes(seedCtx, db); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestRegisterUserHandler_integration_201BodyAndCookie(t *testing.T) {
	db := testMongoDB(t)
	h := RegisterUserHandler(db, Options{DB: db, CookieSecure: false})
	email := fmt.Sprintf("reg+%s@example.com", primitive.NewObjectID().Hex())
	body := fmt.Sprintf(`{"email":%q,"password":"testpass1"}`, email)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h(rec, req)
	res := rec.Result()
	defer res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("status %d", res.StatusCode)
	}
	var got meResponse
	if err := json.NewDecoder(res.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	wantEmail := strings.ToLower(strings.TrimSpace(email))
	if got.Email != wantEmail {
		t.Fatalf("email got %q want %q", got.Email, wantEmail)
	}
	if got.Role != RoleCustomer {
		t.Fatalf("role %q", got.Role)
	}
	if len(got.ID) != 24 {
		t.Fatalf("object id hex len: %q", got.ID)
	}
	var sawAuth bool
	for _, c := range res.Cookies() {
		if c.Name == CookieName() && c.Value != "" {
			sawAuth = true
			break
		}
	}
	if !sawAuth {
		t.Fatal("expected non-empty session cookie")
	}
}

func TestRegisterUserHandler_integration_emailTaken(t *testing.T) {
	db := testMongoDB(t)
	h := RegisterUserHandler(db, Options{DB: db, CookieSecure: false})
	email := fmt.Sprintf("dup+%s@example.com", primitive.NewObjectID().Hex())
	payload := fmt.Sprintf(`{"email":%q,"password":"testpass1"}`, email)
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		h(rec, req)
		code := rec.Result().StatusCode
		_ = rec.Result().Body.Close()
		if i == 0 && code != http.StatusCreated {
			t.Fatalf("first register: status %d", code)
		}
		if i == 1 && code != http.StatusConflict {
			t.Fatalf("second register: status %d", code)
		}
	}
}

func TestLoginHandler_integration_afterRegister(t *testing.T) {
	db := testMongoDB(t)
	reg := RegisterUserHandler(db, Options{DB: db, CookieSecure: false})
	login := loginHandler(db, Options{DB: db, CookieSecure: false})
	email := fmt.Sprintf("log+%s@example.com", primitive.NewObjectID().Hex())
	pass := "testpass1"
	regBody := fmt.Sprintf(`{"email":%q,"password":%q}`, email, pass)
	reqR := httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(regBody))
	reqR.Header.Set("Content-Type", "application/json")
	recR := httptest.NewRecorder()
	reg(recR, reqR)
	if recR.Code != http.StatusCreated {
		t.Fatalf("register status %d", recR.Code)
	}
	reqL := httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(regBody))
	reqL.Header.Set("Content-Type", "application/json")
	recL := httptest.NewRecorder()
	login(recL, reqL)
	res := recL.Result()
	defer res.Body.Close()
	if res.StatusCode != http.StatusNoContent {
		t.Fatalf("login status %d", res.StatusCode)
	}
	var sawAuth bool
	for _, c := range res.Cookies() {
		if c.Name == CookieName() && c.Value != "" {
			sawAuth = true
			break
		}
	}
	if !sawAuth {
		t.Fatal("expected session cookie on login")
	}
}
