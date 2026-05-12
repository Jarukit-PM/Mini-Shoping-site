package auth

import "context"

type ctxKey int

const (
	ctxKeyUserID ctxKey = iota
	ctxKeyRole
)

// WithUser attaches authenticated subject id (hex) and role to the context.
func WithUser(ctx context.Context, userIDHex, role string) context.Context {
	ctx = context.WithValue(ctx, ctxKeyUserID, userIDHex)
	ctx = context.WithValue(ctx, ctxKeyRole, role)
	return ctx
}

// UserID returns the authenticated user's Mongo ObjectId hex or empty if missing.
func UserID(ctx context.Context) string {
	v, _ := ctx.Value(ctxKeyUserID).(string)
	return v
}

// Role returns the session role claim or empty if missing.
func Role(ctx context.Context) string {
	v, _ := ctx.Value(ctxKeyRole).(string)
	return v
}
