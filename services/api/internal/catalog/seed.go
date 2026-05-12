package catalog

import (
	"context"
	"log/slog"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EnsureCatalogIndexes creates a partial unique index on sku for active (non–soft-deleted) products.
func EnsureCatalogIndexes(ctx context.Context, db *mongo.Database) error {
	coll := db.Collection("products")
	_, err := coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "sku", Value: 1}},
		Options: options.Index().
			SetUnique(true).
			SetPartialFilterExpression(bson.M{
				"$or": []bson.M{
					{"deletedAt": bson.M{"$exists": false}},
					{"deletedAt": nil},
				},
			}),
	})
	return err
}

// EnsureDemoProducts inserts a small demo set when the collection is empty.
func EnsureDemoProducts(ctx context.Context, db *mongo.Database) error {
	coll := db.Collection("products")
	n, err := coll.CountDocuments(ctx, bson.D{})
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	demo := []any{
		Product{Name: "Canvas Tote", Description: "Everyday carry", PriceCents: 59000, Currency: "THB", SKU: "TOTE-01", Stock: 40},
		Product{Name: "Stainless Bottle", Description: "500ml insulated", PriceCents: 89000, Currency: "THB", SKU: "BOT-500", Stock: 120},
		Product{Name: "Notebook Set", Description: "A5 × 3", PriceCents: 24900, Currency: "THB", SKU: "NB-A5-3", Stock: 200},
	}
	if _, err := coll.InsertMany(ctx, demo); err != nil {
		return err
	}
	slog.Info("seeded demo products", "count", len(demo))
	return nil
}
