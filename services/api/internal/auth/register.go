package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/httpx"
	"go.mongodb.org/mongo-driver/mongo"
)

// RoleCustomer is the default role for self-service sign-up (storefront cart/checkout).
const RoleCustomer = "customer"

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func validateSignupEmail(raw string) (email string, ok bool) {
	email = strings.TrimSpace(strings.ToLower(raw))
	if email == "" || !strings.Contains(email, "@") {
		return "", false
	}
	return email, true
}

func validateSignupPassword(password string) string {
	if len(password) < 8 {
		return "password must be at least 8 characters"
	}
	if len(password) > 72 {
		return "password must be at most 72 characters"
	}
	return ""
}

// RegisterUserHandler handles POST /v1/auth/register: creates a new customer and sets the session cookie (same as login).
func RegisterUserHandler(db *mongo.Database, opts Options) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body registerRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_json", "request body must be JSON")
			return
		}
		email, emailOk := validateSignupEmail(body.Email)
		if !emailOk {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_email", "valid email is required")
			return
		}
		if msg := validateSignupPassword(body.Password); msg != "" {
			httpx.WriteErrorFields(w, http.StatusBadRequest, "weak_password", msg, map[string]string{"password": msg})
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		_, err := FindUserByEmail(ctx, db, email)
		if err == nil {
			httpx.WriteError(w, http.StatusConflict, "email_taken", "an account with this email already exists")
			return
		}
		if err != mongo.ErrNoDocuments {
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not read user")
			return
		}

		hash, err := HashPassword(body.Password)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "password_error", "could not hash password")
			return
		}
		u := &User{
			Email:        email,
			PasswordHash: string(hash),
			Role:         RoleCustomer,
		}
		if err := InsertUser(ctx, db, u); err != nil {
			if mongo.IsDuplicateKeyError(err) {
				httpx.WriteError(w, http.StatusConflict, "email_taken", "an account with this email already exists")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not create user")
			return
		}
		token, err := CreateSession(ctx, db, u.ID, u.Role, sessionTTL())
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "session_error", "could not create session")
			return
		}
		http.SetCookie(w, sessionCookie(token, opts.CookieSecure))
		// 201 + body so clients get the new user id without an extra /auth/me round-trip (cookie is still set).
		httpx.WriteJSON(w, http.StatusCreated, meResponse{
			ID:    u.ID.Hex(),
			Email: u.Email,
			Role:  u.Role,
		})
	}
}
