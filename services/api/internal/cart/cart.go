package cart

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CartItem struct {
	ProductID          primitive.ObjectID `bson:"productId"          json:"productId"`
	Qty                int32              `bson:"qty"                json:"qty"`
	PriceCentsSnapshot int64              `bson:"priceCentsSnapshot" json:"priceCentsSnapshot"`
}

type Cart struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"userId"        json:"userId"`
	Items     []CartItem         `bson:"items"         json:"items"`
	UpdatedAt time.Time          `bson:"updatedAt"     json:"updatedAt"`
}

// EnsureIndexes creates indexes for carts collection.
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	_, err := db.Collection("carts").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "userId", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("ux_carts_userId"),
	})
	return err
}
