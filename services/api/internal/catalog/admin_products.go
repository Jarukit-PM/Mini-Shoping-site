package catalog

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const invalidPriceTH = "ราคาสินค้าต้องมากกว่า 0"

type adminProductRequest struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	PriceCents  int64  `json:"priceCents"`
	Currency    string `json:"currency"`
	SKU         string `json:"sku"`
	Stock       int32  `json:"stock"`
	Category    string `json:"category,omitempty"`
	ImageURL    string `json:"imageUrl,omitempty"`
}

type adminProductPatch struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	PriceCents  *int64  `json:"priceCents"`
	Currency    *string `json:"currency"`
	SKU         *string `json:"sku"`
	Stock       *int32  `json:"stock"`
	Category    *string `json:"category"`
	ImageURL    *string `json:"imageUrl"`
}

// RegisterAdminRoutes mounts admin product CRUD under `/admin` (full path `/v1/admin/products`).
func RegisterAdminRoutes(r chi.Router, db *mongo.Database) {
	r.Get("/products/{id}", getAdminProduct(db))
	r.Post("/products", createAdminProduct(db))
	r.Patch("/products/{id}", patchAdminProduct(db))
	r.Delete("/products/{id}", deleteAdminProduct(db))
}

func getAdminProduct(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		idHex := chi.URLParam(req, "id")
		oid, err := primitive.ObjectIDFromHex(idHex)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_id", "invalid product id")
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		var p Product
		err = db.Collection("products").FindOne(ctx, bson.M{"_id": oid}).Decode(&p)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				httpx.WriteError(w, http.StatusNotFound, "not_found", "product not found")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not load product")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, productToJSON(p))
	}
}

func createAdminProduct(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		var body adminProductRequest
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_json", "request body must be JSON")
			return
		}
		fields := validateAdminProductCreate(body)
		if len(fields) > 0 {
			msg := "validation failed"
			httpx.WriteErrorFields(w, http.StatusBadRequest, "missing_field", msg, fields)
			return
		}
		if body.PriceCents <= 0 {
			httpx.WriteErrorFields(w, http.StatusBadRequest, "invalid_price", invalidPriceTH, map[string]string{
				"priceCents": invalidPriceTH,
			})
			return
		}
		if body.Stock < 0 {
			httpx.WriteErrorFields(w, http.StatusBadRequest, "missing_field", "stock must be >= 0", map[string]string{
				"stock": "stock must be >= 0",
			})
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		sku := strings.TrimSpace(body.SKU)
		n, err := db.Collection("products").CountDocuments(ctx, bson.M{
			"sku": sku,
			"$or": []bson.M{{"deletedAt": nil}, {"deletedAt": bson.M{"$exists": false}}},
		})
		if err == nil && n > 0 {
			httpx.WriteError(w, http.StatusConflict, "duplicate_sku", "sku already exists")
			return
		}
		cur := strings.TrimSpace(body.Currency)
		if cur == "" {
			cur = "THB"
		}
		p := Product{
			Name:        strings.TrimSpace(body.Name),
			Description: strings.TrimSpace(body.Description),
			PriceCents:  body.PriceCents,
			Currency:    cur,
			SKU:         sku,
			Stock:       body.Stock,
			Category:    strings.TrimSpace(body.Category),
			ImageURL:    strings.TrimSpace(body.ImageURL),
		}
		res, err := db.Collection("products").InsertOne(ctx, p)
		if err != nil {
			if mongo.IsDuplicateKeyError(err) {
				httpx.WriteError(w, http.StatusConflict, "duplicate_sku", "sku already exists")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not create product")
			return
		}
		if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
			p.ID = oid
		}
		httpx.WriteJSON(w, http.StatusCreated, productToJSON(p))
	}
}

func patchAdminProduct(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		idHex := chi.URLParam(req, "id")
		oid, err := primitive.ObjectIDFromHex(idHex)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_id", "invalid product id")
			return
		}
		var body adminProductPatch
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_json", "request body must be JSON")
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		var cur Product
		err = db.Collection("products").FindOne(ctx, activeProductFilter(oid)).Decode(&cur)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				httpx.WriteError(w, http.StatusNotFound, "not_found", "product not found")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not load product")
			return
		}
		set := bson.M{}
		if body.Name != nil {
			n := strings.TrimSpace(*body.Name)
			if n == "" {
				httpx.WriteErrorFields(w, http.StatusBadRequest, "missing_field", "name cannot be empty", map[string]string{
					"name": "required",
				})
				return
			}
			set["name"] = n
		}
		if body.Description != nil {
			set["description"] = strings.TrimSpace(*body.Description)
		}
		if body.PriceCents != nil {
			if *body.PriceCents <= 0 {
				httpx.WriteErrorFields(w, http.StatusBadRequest, "invalid_price", invalidPriceTH, map[string]string{
					"priceCents": invalidPriceTH,
				})
				return
			}
			set["priceCents"] = *body.PriceCents
		}
		if body.Currency != nil {
			set["currency"] = strings.TrimSpace(*body.Currency)
		}
		if body.SKU != nil {
			newSKU := strings.TrimSpace(*body.SKU)
			if newSKU != "" && newSKU != cur.SKU {
				n, err := db.Collection("products").CountDocuments(ctx, bson.M{
					"sku": newSKU,
					"_id": bson.M{"$ne": oid},
					"$or": []bson.M{{"deletedAt": nil}, {"deletedAt": bson.M{"$exists": false}}},
				})
				if err == nil && n > 0 {
					httpx.WriteError(w, http.StatusConflict, "duplicate_sku", "sku already exists")
					return
				}
				set["sku"] = newSKU
			}
		}
		if body.Stock != nil {
			if *body.Stock < 0 {
				httpx.WriteErrorFields(w, http.StatusBadRequest, "missing_field", "stock must be >= 0", map[string]string{
					"stock": "stock must be >= 0",
				})
				return
			}
			set["stock"] = *body.Stock
		}
		if body.Category != nil {
			set["category"] = strings.TrimSpace(*body.Category)
		}
		if body.ImageURL != nil {
			set["imageUrl"] = strings.TrimSpace(*body.ImageURL)
		}
		if len(set) == 0 {
			httpx.WriteJSON(w, http.StatusOK, productToJSON(cur))
			return
		}
		_, err = db.Collection("products").UpdateOne(ctx, activeProductFilter(oid), bson.M{"$set": set})
		if err != nil {
			if mongo.IsDuplicateKeyError(err) {
				httpx.WriteError(w, http.StatusConflict, "duplicate_sku", "sku already exists")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not update product")
			return
		}
		err = db.Collection("products").FindOne(ctx, activeProductFilter(oid)).Decode(&cur)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not load product")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, productToJSON(cur))
	}
}

func deleteAdminProduct(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		idHex := chi.URLParam(req, "id")
		oid, err := primitive.ObjectIDFromHex(idHex)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_id", "invalid product id")
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		now := time.Now().UTC()
		res, err := db.Collection("products").UpdateOne(ctx, activeProductFilter(oid), bson.M{"$set": bson.M{"deletedAt": now}})
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not delete product")
			return
		}
		if res.MatchedCount == 0 {
			httpx.WriteError(w, http.StatusNotFound, "not_found", "product not found")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func activeProductFilter(id primitive.ObjectID) bson.M {
	return bson.M{
		"_id": id,
		"$or": []bson.M{
			{"deletedAt": nil},
			{"deletedAt": bson.M{"$exists": false}},
		},
	}
}

func validateAdminProductCreate(body adminProductRequest) map[string]string {
	out := map[string]string{}
	if strings.TrimSpace(body.Name) == "" {
		out["name"] = "required"
	}
	if strings.TrimSpace(body.SKU) == "" {
		out["sku"] = "required"
	}
	return out
}

func productToJSON(p Product) productJSON {
	return productJSON{
		ID:          p.ID.Hex(),
		Name:        p.Name,
		Description: p.Description,
		PriceCents:  p.PriceCents,
		Currency:    p.Currency,
		SKU:         p.SKU,
		Stock:       p.Stock,
		Category:    p.Category,
		ImageURL:    p.ImageURL,
	}
}
