package catalog

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

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
}

// RegisterRoutes mounts catalog endpoints under the given router (caller should use a `/v1` sub-router).
func RegisterRoutes(r chiRouter, db *mongo.Database) {
	r.Get("/products", listProducts(db))
}

// chiRouter is the minimal surface from chi we need (easier to test than concrete *chi.Mux).
type chiRouter interface {
	Get(pattern string, h http.HandlerFunc)
}

func listProducts(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		cur, err := db.Collection("products").Find(ctx, bson.D{})
		if err != nil {
			http.Error(w, `{"error":"database_error"}`, http.StatusInternalServerError)
			return
		}
		defer func() { _ = cur.Close(ctx) }()
		var raw []Product
		if err := cur.All(ctx, &raw); err != nil {
			http.Error(w, `{"error":"database_error"}`, http.StatusInternalServerError)
			return
		}
		out := make([]productJSON, 0, len(raw))
		for _, p := range raw {
			out = append(out, productJSON{
				ID:          p.ID.Hex(),
				Name:        p.Name,
				Description: p.Description,
				PriceCents:  p.PriceCents,
				Currency:    p.Currency,
				SKU:         p.SKU,
				Stock:       p.Stock,
			})
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(listResponse{Items: out})
	}
}
