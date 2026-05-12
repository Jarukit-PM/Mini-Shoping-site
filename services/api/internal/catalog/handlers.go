package catalog

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type listResponse struct {
	Items []productJSON `json:"items"`
}

type productJSON struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	PriceCents  int64  `json:"priceCents"`
	Currency    string `json:"currency"`
	SKU         string `json:"sku"`
	Stock       int32  `json:"stock"`
	Category    string `json:"category,omitempty"`
	ImageURL    string `json:"imageUrl,omitempty"`
}

// RegisterPublicRoutes mounts public catalog endpoints under `/v1`.
func RegisterPublicRoutes(r chi.Router, db *mongo.Database) {
	r.Get("/products", listProducts(db))
}

func listProducts(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		filter := bson.M{
			"$or": []bson.M{
				{"deletedAt": nil},
				{"deletedAt": bson.M{"$exists": false}},
			},
		}
		cur, err := db.Collection("products").Find(ctx, filter)
		if err != nil {
			http.Error(w, `{"error":{"code":"database_error","message":"query failed"}}`, http.StatusInternalServerError)
			return
		}
		defer func() { _ = cur.Close(ctx) }()
		var raw []Product
		if err := cur.All(ctx, &raw); err != nil {
			http.Error(w, `{"error":{"code":"database_error","message":"decode failed"}}`, http.StatusInternalServerError)
			return
		}
		out := make([]productJSON, 0, len(raw))
		for _, p := range raw {
			out = append(out, productToJSON(p))
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(listResponse{Items: out})
	}
}
