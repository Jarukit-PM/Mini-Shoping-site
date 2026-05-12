package authstub

import (
	"context"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ctxKey int

const userIDKey ctxKey = 1

// Fixed dev user for local work without auth headers.
var devUserID = primitive.NewObjectIDFromTimestamp(timeMustParse("2025-01-01T00:00:00Z"))

func timeMustParse(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return t
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hex := r.Header.Get("X-Stub-User-Id")
		uid := devUserID
		if hex != "" {
			if parsed, err := primitive.ObjectIDFromHex(hex); err == nil {
				uid = parsed
			}
		}
		ctx := context.WithValue(r.Context(), userIDKey, uid)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func UserID(ctx context.Context) primitive.ObjectID {
	if v, ok := ctx.Value(userIDKey).(primitive.ObjectID); ok {
		return v
	}
	return primitive.NilObjectID
}
