package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/httpx"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Options configures auth HTTP handlers.
type Options struct {
	DB           *mongo.Database
	CookieSecure bool
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type meResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// RegisterRoutes mounts /v1/auth/* (caller mounts under /v1).
func RegisterRoutes(r interface {
	Get(pattern string, h http.HandlerFunc)
	Post(pattern string, h http.HandlerFunc)
}, db *mongo.Database, opts Options) {
	r.Post("/auth/login", loginHandler(db, opts))
	r.Post("/auth/register", RegisterUserHandler(db, opts))
	r.Post("/auth/logout", logoutHandler(db, opts))
}

// RegisterMeRoute mounts GET /auth/me behind RequireAuth in the caller.
func RegisterMeRoute(r interface {
	Get(pattern string, h http.HandlerFunc)
}, db *mongo.Database) {
	r.Get("/auth/me", meHandler(db))
}

func sessionTTL() time.Duration {
	h := strings.TrimSpace(os.Getenv("SESSION_TTL_HOURS"))
	if h == "" {
		return 24 * time.Hour
	}
	n, err := strconv.Atoi(h)
	if err != nil || n <= 0 {
		return 24 * time.Hour
	}
	return time.Duration(n) * time.Hour
}

func loginHandler(db *mongo.Database, opts Options) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body loginRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_json", "request body must be JSON")
			return
		}
		email := strings.TrimSpace(strings.ToLower(body.Email))
		if email == "" || body.Password == "" {
			httpx.WriteError(w, http.StatusBadRequest, "missing_field", "email and password are required")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		u, err := FindUserByEmail(ctx, db, email)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				httpx.WriteError(w, http.StatusUnauthorized, "invalid_credentials", "invalid email or password")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not read user")
			return
		}
		if err := ComparePassword([]byte(u.PasswordHash), body.Password); err != nil {
			httpx.WriteError(w, http.StatusUnauthorized, "invalid_credentials", "invalid email or password")
			return
		}
		token, err := CreateSession(ctx, db, u.ID, u.Role, sessionTTL())
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "session_error", "could not create session")
			return
		}
		http.SetCookie(w, sessionCookie(token, opts.CookieSecure))
		w.WriteHeader(http.StatusNoContent)
	}
}

func logoutHandler(db *mongo.Database, opts Options) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		if c, err := r.Cookie(cookieName); err == nil && c.Value != "" {
			_ = DeleteSessionByToken(ctx, db, c.Value)
		}
		http.SetCookie(w, clearSessionCookie(opts.CookieSecure))
		w.WriteHeader(http.StatusNoContent)
	}
}

func meHandler(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idHex := UserID(r.Context())
		if idHex == "" {
			httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
			return
		}
		oid, err := primitive.ObjectIDFromHex(idHex)
		if err != nil {
			httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		u, err := FindUserByID(ctx, db, oid)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "user no longer exists")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not read user")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, meResponse{
			ID:    u.ID.Hex(),
			Email: u.Email,
			Role:  u.Role,
		})
	}
}

func sessionCookie(token string, secure bool) *http.Cookie {
	maxAge := int(sessionTTL().Seconds())
	if maxAge < 60 {
		maxAge = int((24 * time.Hour).Seconds())
	}
	return &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	}
}

func clearSessionCookie(secure bool) *http.Cookie {
	return &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	}
}

// CookieSecureFromEnv returns true when APP_ENV=production or COOKIE_SECURE=true.
func CookieSecureFromEnv() bool {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "production") {
		return true
	}
	v, err := strconv.ParseBool(strings.TrimSpace(os.Getenv("COOKIE_SECURE")))
	return err == nil && v
}
