package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// cookieName is the httpOnly session cookie (opaque token stored in MongoDB `sessions`).
const cookieName = "auth"

// CookieName exposes the cookie name for tests or tooling.
func CookieName() string { return cookieName }

const sessionsCollection = "sessions"

// Session is a server-side login session (opaque token in cookie, row in MongoDB).
type Session struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	UserID    primitive.ObjectID `bson:"userId"`
	Role      string             `bson:"role"`
	Token     string             `bson:"token"`
	ExpiresAt time.Time          `bson:"expiresAt"`
	CreatedAt time.Time          `bson:"createdAt"`
}

func sessionsColl(db *mongo.Database) *mongo.Collection {
	return db.Collection(sessionsCollection)
}

// EnsureSessionIndexes creates a unique index on token and a TTL index on expiresAt.
func EnsureSessionIndexes(ctx context.Context, db *mongo.Database) error {
	coll := sessionsColl(db)
	if _, err := coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "token", Value: 1}},
		Options: options.Index().SetUnique(true),
	}); err != nil {
		return err
	}
	_, err := coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "expiresAt", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	})
	return err
}

// CreateSession inserts a new session and returns the opaque token to send in the cookie.
func CreateSession(ctx context.Context, db *mongo.Database, userID primitive.ObjectID, role string, ttl time.Duration) (token string, err error) {
	var buf [32]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", err
	}
	token = hex.EncodeToString(buf[:])
	now := time.Now().UTC()
	s := Session{
		UserID:    userID,
		Role:      role,
		Token:     token,
		ExpiresAt: now.Add(ttl),
		CreatedAt: now,
	}
	_, err = sessionsColl(db).InsertOne(ctx, s)
	if err != nil {
		return "", err
	}
	return token, nil
}

// FindValidSession returns the session if the token exists and is not expired.
func FindValidSession(ctx context.Context, db *mongo.Database, token string) (*Session, error) {
	if token == "" {
		return nil, mongo.ErrNoDocuments
	}
	var s Session
	err := sessionsColl(db).FindOne(ctx, bson.M{
		"token":     token,
		"expiresAt": bson.M{"$gt": time.Now().UTC()},
	}).Decode(&s)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// DeleteSessionByToken removes a session (logout).
func DeleteSessionByToken(ctx context.Context, db *mongo.Database, token string) error {
	if token == "" {
		return nil
	}
	_, err := sessionsColl(db).DeleteOne(ctx, bson.M{"token": token})
	return err
}
