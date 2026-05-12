package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/httpx"
	"go.mongodb.org/mongo-driver/mongo"
)

// RequireAuth validates the `auth` session cookie against MongoDB and attaches UserID + Role to context.
func RequireAuth(db *mongo.Database) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie(cookieName)
			if err != nil || c.Value == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
				return
			}
			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			defer cancel()
			s, err := FindValidSession(ctx, db, c.Value)
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
				return
			}
			nextCtx := WithUser(r.Context(), s.UserID.Hex(), s.Role)
			next.ServeHTTP(w, r.WithContext(nextCtx))
		})
	}
}

// RequireAdmin allows only users with role "admin".
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if Role(r.Context()) != "admin" {
			httpx.WriteError(w, http.StatusForbidden, "forbidden", "admin role required")
			return
		}
		next.ServeHTTP(w, r)
	})
}
