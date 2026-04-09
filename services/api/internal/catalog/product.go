package catalog

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Product is a catalog item stored in MongoDB collection `products`.
type Product struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name        string             `json:"name" bson:"name"`
	Description string             `json:"description,omitempty" bson:"description,omitempty"`
	PriceCents  int64              `json:"priceCents" bson:"priceCents"`
	Currency    string             `json:"currency" bson:"currency"`
	SKU         string             `json:"sku" bson:"sku"`
	Stock       int32              `json:"stock" bson:"stock"`
}
