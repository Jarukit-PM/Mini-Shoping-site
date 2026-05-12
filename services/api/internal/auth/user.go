package auth

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const usersCollection = "users"

// User is stored in MongoDB collection `users`.
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	Email        string             `bson:"email"`
	PasswordHash string             `bson:"passwordHash"`
	Role         string             `bson:"role"`
	CreatedAt    time.Time          `bson:"createdAt"`
}

func usersColl(db *mongo.Database) *mongo.Collection {
	return db.Collection(usersCollection)
}

// EnsureUserIndexes creates a unique index on email.
func EnsureUserIndexes(ctx context.Context, db *mongo.Database) error {
	_, err := usersColl(db).Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	return err
}

// CountUsers returns the number of user documents.
func CountUsers(ctx context.Context, db *mongo.Database) (int64, error) {
	return usersColl(db).CountDocuments(ctx, bson.D{})
}

// FindUserByEmail looks up a user by email (exact match; normalize before call).
func FindUserByEmail(ctx context.Context, db *mongo.Database, email string) (*User, error) {
	var u User
	err := usersColl(db).FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// FindUserByID loads a user by ObjectId.
func FindUserByID(ctx context.Context, db *mongo.Database, id primitive.ObjectID) (*User, error) {
	var u User
	err := usersColl(db).FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// InsertUser inserts a new user document.
func InsertUser(ctx context.Context, db *mongo.Database, u *User) error {
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now().UTC()
	}
	res, err := usersColl(db).InsertOne(ctx, u)
	if err != nil {
		return err
	}
	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		u.ID = oid
	}
	return nil
}
