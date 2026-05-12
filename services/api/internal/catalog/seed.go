package catalog

import (
	"context"
	"log/slog"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EnsureDemoProducts ensures a small demo set exists (inserts missing products by SKU).
func EnsureDemoProducts(ctx context.Context, db *mongo.Database) error {
	coll := db.Collection("products")
	demo := []Product{
		{Name: "Canvas Tote", Description: "Everyday carry", Category: "Bags", ImageURL: "https://cdn.shopify.com/s/files/1/0608/9726/3853/files/8859152686622__1_c2339787-7d6a-4c18-97e1-483dafc8b70a_600x.jpg?v=1757065748", PriceCents: 59000, Currency: "THB", SKU: "TOTE-01", Stock: 40},
		{Name: "Stainless Bottle", Description: "500ml insulated", Category: "Drinkware", ImageURL: "https://placehold.co/600x400?text=Stainless%20Bottle", PriceCents: 89000, Currency: "THB", SKU: "BOT-500", Stock: 120},
		{Name: "Notebook Set", Description: "A5 × 3", Category: "Stationery", ImageURL: "https://placehold.co/600x400?text=Notebook%20Set", PriceCents: 24900, Currency: "THB", SKU: "NB-A5-3", Stock: 200},
		{Name: "Desk Lamp", Description: "LED, warm light", Category: "Home", ImageURL: "https://placehold.co/600x400?text=Desk%20Lamp", PriceCents: 129000, Currency: "THB", SKU: "LAMP-LED-01", Stock: 25},
	}

	var inserted int64
	var updated int64
	for _, p := range demo {
		res, err := coll.UpdateOne(
			ctx,
			bson.D{{Key: "sku", Value: p.SKU}},
			bson.D{{Key: "$set", Value: bson.D{
				{Key: "name", Value: p.Name},
				{Key: "description", Value: p.Description},
				{Key: "category", Value: p.Category},
				{Key: "imageUrl", Value: p.ImageURL},
				{Key: "priceCents", Value: p.PriceCents},
				{Key: "currency", Value: p.Currency},
				{Key: "sku", Value: p.SKU},
				{Key: "stock", Value: p.Stock},
			}}},
			options.Update().SetUpsert(true),
		)
		if err != nil {
			return err
		}
		inserted += res.UpsertedCount
		updated += res.ModifiedCount
	}
	if inserted > 0 || updated > 0 {
		slog.Info("seeded demo products", "inserted", inserted, "updated", updated, "totalDemo", len(demo))
	}
	return nil
}

// EnsureIndexes creates indexes used by catalog (call on startup).
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	col := db.Collection("products")
	_, err := col.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "sku", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetName("ux_products_sku_active").
				SetPartialFilterExpression(bson.M{
					"$or": []bson.M{
						{"deletedAt": bson.M{"$exists": false}},
						{"deletedAt": nil},
					},
				}),
		},
		{
			Keys:    bson.D{{Key: "name", Value: "text"}, {Key: "description", Value: "text"}},
			Options: options.Index().SetName("tx_products_search"),
		},
		{
			Keys:    bson.D{{Key: "category", Value: 1}},
			Options: options.Index().SetName("ix_products_category"),
		},
	})
	return err
}
