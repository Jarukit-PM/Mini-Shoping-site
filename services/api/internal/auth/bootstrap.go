package auth

import (
	"context"
	"log/slog"
	"os"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// adminEnvCredentials reads ADMIN_EMAIL / ADMIN_PASSWORD from the environment
// (same rules as .env.example): email is trimmed and lowercased; password is trimmed;
// ok is false if either value is missing after trim.
func adminEnvCredentials() (email string, pass string, ok bool) {
	email = strings.TrimSpace(strings.ToLower(os.Getenv("ADMIN_EMAIL")))
	pass = strings.TrimSpace(os.Getenv("ADMIN_PASSWORD"))
	ok = email != "" && pass != ""
	return
}

// EnsureBootstrapAdmin seeds the first admin when `users` is empty (Q-01).
func EnsureBootstrapAdmin(ctx context.Context, db *mongo.Database) error {
	if err := EnsureUserIndexes(ctx, db); err != nil {
		return err
	}
	n, err := CountUsers(ctx, db)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	email, pass, ok := adminEnvCredentials()
	if !ok {
		slog.Warn("users collection empty; set ADMIN_EMAIL and ADMIN_PASSWORD to seed bootstrap admin")
		return nil
	}
	hash, err := HashPassword(pass)
	if err != nil {
		return err
	}
	u := &User{
		Email:        email,
		PasswordHash: string(hash),
		Role:         "admin",
	}
	if err := InsertUser(ctx, db, u); err != nil {
		return err
	}
	slog.Info("seeded bootstrap admin user", "email", email)
	return nil
}

// SyncAdminPasswordFromEnv updates the stored password for ADMIN_EMAIL to match ADMIN_PASSWORD.
// This runs only when APP_ENV is not "production", so local Docker or dev can align Mongo with .env
// after the users collection was already created (otherwise bootstrap only runs once).
func SyncAdminPasswordFromEnv(ctx context.Context, db *mongo.Database) error {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "production") {
		return nil
	}
	email, pass, ok := adminEnvCredentials()
	if !ok {
		return nil
	}
	hash, err := HashPassword(pass)
	if err != nil {
		return err
	}
	res, err := usersColl(db).UpdateOne(ctx, bson.M{"email": email}, bson.M{"$set": bson.M{"passwordHash": string(hash)}})
	if err != nil {
		return err
	}
	if res.MatchedCount > 0 {
		slog.Info("updated admin password from environment", "email", email)
	}
	return nil
}
