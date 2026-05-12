package cart

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/auth"
	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/catalog"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type cartLineResponse struct {
	ProductID      primitive.ObjectID `json:"productId"`
	Name           string             `json:"name"`
	ImageUrl       string             `json:"imageUrl,omitempty"`
	Qty            int32              `json:"qty"`
	UnitPriceCents int64              `json:"unitPriceCents"`
	LineTotalCents int64              `json:"lineTotalCents"`
}

type cartResponse struct {
	Items           []cartLineResponse `json:"items"`
	GrandTotalCents int64              `json:"grandTotalCents"`
	Currency        string             `json:"currency"`
}

func RegisterRoutes(r chi.Router, db *mongo.Database, requireAuth func(http.Handler) http.Handler) {
	svc := New(db)
	r.Route("/cart", func(r chi.Router) {
		r.Use(requireAuth)
		r.Get("/", getCartHandler(svc, db))
		r.Post("/items", addItemHandler(svc, db))
		r.Patch("/items/{productId}", setQtyHandler(svc, db))
		r.Delete("/items/{productId}", removeItemHandler(svc, db))
	})
}

func getCartHandler(svc *Service, db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDHex := auth.UserID(r.Context())
		userID, err := primitive.ObjectIDFromHex(userIDHex)
		if err != nil {
			writeError(w, 401, "unauthorized", "authentication required", nil)
			return
		}
		cart, err := svc.Get(r.Context(), userID)
		if err != nil {
			writeError(w, 500, "server_error", err.Error(), nil)
			return
		}

		// enrich products
		ids := make([]primitive.ObjectID, 0, len(cart.Items))
		for _, it := range cart.Items {
			ids = append(ids, it.ProductID)
		}
		prodMap := map[primitive.ObjectID]catalog.Product{}
		if len(ids) > 0 {
			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			defer cancel()
			cur, err := db.Collection("products").Find(ctx, bson.M{"_id": bson.M{"$in": ids}})
			if err == nil {
				var prods []catalog.Product
				_ = cur.All(ctx, &prods)
				for _, p := range prods {
					prodMap[p.ID] = p
				}
			}
		}

		out := make([]cartLineResponse, 0, len(cart.Items))
		var grand int64 = 0
		currency := ""
		for _, it := range cart.Items {
			p := prodMap[it.ProductID]
			line := cartLineResponse{
				ProductID:      it.ProductID,
				Name:           p.Name,
				ImageUrl:       p.ImageURL,
				Qty:            it.Qty,
				UnitPriceCents: it.PriceCentsSnapshot,
				LineTotalCents: int64(it.Qty) * it.PriceCentsSnapshot,
			}
			grand += line.LineTotalCents
			if currency == "" {
				currency = p.Currency
			}
			out = append(out, line)
		}
		writeJSON(w, 200, cartResponse{Items: out, GrandTotalCents: grand, Currency: currency})
	}
}

func addItemHandler(svc *Service, db *mongo.Database) http.HandlerFunc {
	type reqBody struct {
		ProductID string `json:"productId"`
		Qty       int32  `json:"qty"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body reqBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, 400, "bad_request", "invalid json", nil)
			return
		}
		pid, err := primitive.ObjectIDFromHex(body.ProductID)
		if err != nil {
			writeError(w, 400, "bad_id", "invalid product id", nil)
			return
		}
		userIDHex := auth.UserID(r.Context())
		userID, err := primitive.ObjectIDFromHex(userIDHex)
		if err != nil {
			writeError(w, 401, "unauthorized", "authentication required", nil)
			return
		}
		_, err = svc.AddItem(r.Context(), userID, pid, body.Qty)
		if err != nil {
			if err == ErrProductNotFound {
				writeError(w, 404, "not_found", "product not found", nil)
				return
			}
			if err == ErrOutOfStock {
				// try to fetch available
				var p struct {
					Stock int32 `bson:"stock"`
				}
				_ = db.Collection("products").FindOne(r.Context(), bson.M{"_id": pid}).Decode(&p)
				details := map[string]any{"productId": body.ProductID}
				if p.Stock >= 0 {
					details["available"] = p.Stock
				}
				writeError(w, 409, "out_of_stock", "out of stock", details)
				return
			}
			writeError(w, 500, "server_error", err.Error(), nil)
			return
		}
		// return updated cart
		getCartHandler(svc, db)(w, r)
	}
}

func setQtyHandler(svc *Service, db *mongo.Database) http.HandlerFunc {
	type reqBody struct {
		Qty int32 `json:"qty"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		pidHex := chi.URLParam(r, "productId")
		pid, err := primitive.ObjectIDFromHex(pidHex)
		if err != nil {
			writeError(w, 400, "bad_id", "invalid product id", nil)
			return
		}
		var body reqBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, 400, "bad_request", "invalid json", nil)
			return
		}
		userIDHex := auth.UserID(r.Context())
		userID, err := primitive.ObjectIDFromHex(userIDHex)
		if err != nil {
			writeError(w, 401, "unauthorized", "authentication required", nil)
			return
		}
		_, err = svc.SetQty(r.Context(), userID, pid, body.Qty)
		if err != nil {
			if err == ErrProductNotFound {
				writeError(w, 404, "not_found", "product not found", nil)
				return
			}
			if err == ErrOutOfStock {
				var p struct {
					Stock int32 `bson:"stock"`
				}
				_ = db.Collection("products").FindOne(r.Context(), bson.M{"_id": pid}).Decode(&p)
				details := map[string]any{"productId": pidHex}
				if p.Stock >= 0 {
					details["available"] = p.Stock
				}
				writeError(w, 409, "out_of_stock", "out of stock", details)
				return
			}
			writeError(w, 500, "server_error", err.Error(), nil)
			return
		}
		getCartHandler(svc, db)(w, r)
	}
}

func removeItemHandler(svc *Service, db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		pidHex := chi.URLParam(r, "productId")
		pid, err := primitive.ObjectIDFromHex(pidHex)
		if err != nil {
			writeError(w, 400, "bad_id", "invalid product id", nil)
			return
		}
		userIDHex := auth.UserID(r.Context())
		userID, err := primitive.ObjectIDFromHex(userIDHex)
		if err != nil {
			writeError(w, 401, "unauthorized", "authentication required", nil)
			return
		}
		_, err = svc.RemoveItem(r.Context(), userID, pid)
		if err != nil {
			writeError(w, 500, "server_error", err.Error(), nil)
			return
		}
		getCartHandler(svc, db)(w, r)
	}
}
