package catalog

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type listResponse struct {
	Items    []productJSON `json:"items"`
	Page     int           `json:"page"`
	PageSize int           `json:"pageSize"`
	Total    int64         `json:"total"`
}

type productJSON struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Category    string `json:"category,omitempty"`
	ImageURL    string `json:"imageUrl,omitempty"`
	PriceCents  int64  `json:"priceCents"`
	Currency    string `json:"currency"`
	SKU         string `json:"sku"`
	Stock       int32  `json:"stock"`
}

// RegisterPublicRoutes mounts public catalog endpoints under `/v1`.
func RegisterPublicRoutes(r chi.Router, db *mongo.Database) {
	r.Get("/products", listProducts(db))
	r.Get("/products/{id}", getProduct(db))
}

func listProducts(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		q := strings.TrimSpace(req.URL.Query().Get("q"))
		category := strings.TrimSpace(req.URL.Query().Get("category"))
		page := atoiOr(req.URL.Query().Get("page"), 1)
		if page < 1 {
			page = 1
		}
		pageSize := atoiOr(req.URL.Query().Get("pageSize"), 20)
		if pageSize < 1 || pageSize > 100 {
			pageSize = 20
		}

		filter := bson.M{
			"$or": []bson.M{
				{"deletedAt": nil},
				{"deletedAt": bson.M{"$exists": false}},
			},
		}
		if q != "" {
			filter["$text"] = bson.M{"$search": q}
		}
		if category != "" {
			filter["category"] = category
		}

		col := db.Collection("products")
		total, err := col.CountDocuments(ctx, filter)
		if err != nil {
			writeError(w, 500, "database_error", err.Error(), nil)
			return
		}

		opts := options.Find().SetSkip(int64((page - 1) * pageSize)).SetLimit(int64(pageSize)).SetSort(bson.D{{Key: "name", Value: 1}})
		cur, err := col.Find(ctx, filter, opts)
		if err != nil {
			writeError(w, 500, "database_error", err.Error(), nil)
			return
		}
		defer cur.Close(ctx)

		items := []Product{}
		if err := cur.All(ctx, &items); err != nil {
			writeError(w, 500, "database_error", err.Error(), nil)
			return
		}

		out := make([]productJSON, 0, len(items))
		for _, p := range items {
			out = append(out, productToJSON(p))
		}
		writeJSON(w, 200, listResponse{Items: out, Page: page, PageSize: pageSize, Total: total})
	}
}

func getProduct(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idHex := chi.URLParam(r, "id")
		id, err := primitive.ObjectIDFromHex(idHex)
		if err != nil {
			writeError(w, 400, "bad_id", "invalid product id", nil)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var p Product
		err = db.Collection("products").FindOne(ctx, activeProductFilter(id)).Decode(&p)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				writeError(w, 404, "not_found", "product not found", nil)
				return
			}
			writeError(w, 500, "database_error", err.Error(), nil)
			return
		}
		writeJSON(w, 200, p)
	}
}
