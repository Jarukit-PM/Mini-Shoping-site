package orderadmin

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type totalsDoc struct {
	GrandTotalCents int64 `bson:"grandTotalCents"`
}

type orderDoc struct {
	ID        primitive.ObjectID `bson:"_id"`
	UserID    primitive.ObjectID `bson:"userId"`
	Status    string             `bson:"status"`
	Totals    totalsDoc          `bson:"totals"`
	CreatedAt time.Time          `bson:"createdAt"`
}

type orderSummaryJSON struct {
	ID              string `json:"id"`
	UserID          string `json:"userId"`
	Status          string `json:"status"`
	CreatedAt       string `json:"createdAt"`
	GrandTotalCents int64  `json:"grandTotalCents"`
}

type listOrdersResponse struct {
	Items []orderSummaryJSON `json:"items"`
}

type patchStatusRequest struct {
	Status string `json:"status"`
}

// RegisterRoutes mounts `/orders` under `/v1/admin`.
func RegisterRoutes(r chi.Router, db *mongo.Database) {
	r.Get("/orders", listOrders(db))
	r.Patch("/orders/{id}/status", patchOrderStatus(db))
}

func listOrders(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		ctx, cancel := context.WithTimeout(req.Context(), 15*time.Second)
		defer cancel()
		opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(500)
		cur, err := db.Collection("orders").Find(ctx, bson.D{}, opts)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not list orders")
			return
		}
		defer func() { _ = cur.Close(ctx) }()
		var docs []orderDoc
		if err := cur.All(ctx, &docs); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not decode orders")
			return
		}
		out := make([]orderSummaryJSON, 0, len(docs))
		for _, d := range docs {
			out = append(out, orderSummaryJSON{
				ID:              d.ID.Hex(),
				UserID:          d.UserID.Hex(),
				Status:          d.Status,
				CreatedAt:       d.CreatedAt.UTC().Format(time.RFC3339),
				GrandTotalCents: d.Totals.GrandTotalCents,
			})
		}
		httpx.WriteJSON(w, http.StatusOK, listOrdersResponse{Items: out})
	}
}

func patchOrderStatus(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		idHex := chi.URLParam(req, "id")
		oid, err := primitive.ObjectIDFromHex(idHex)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_id", "invalid order id")
			return
		}
		var body patchStatusRequest
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_json", "request body must be JSON")
			return
		}
		to := body.Status
		if to != "Paid" && to != "Shipped" && to != "Cancelled" {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_status", "status must be Paid, Shipped, or Cancelled")
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		var cur orderDoc
		err = db.Collection("orders").FindOne(ctx, bson.M{"_id": oid}).Decode(&cur)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				httpx.WriteError(w, http.StatusNotFound, "not_found", "order not found")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not load order")
			return
		}
		if !canTransition(cur.Status, to) {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_transition", "status cannot change from "+cur.Status+" to "+to)
			return
		}
		_, err = db.Collection("orders").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"status": to}})
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not update order")
			return
		}
		cur.Status = to
		httpx.WriteJSON(w, http.StatusOK, orderResponse(cur))
	}
}

func orderResponse(d orderDoc) map[string]any {
	return map[string]any{
		"id":        d.ID.Hex(),
		"userId":    d.UserID.Hex(),
		"status":    d.Status,
		"createdAt": d.CreatedAt.UTC().Format(time.RFC3339),
		"totals":    d.Totals,
	}
}

func canTransition(from, to string) bool {
	if from == to {
		return true
	}
	switch from {
	case "Pending":
		return to == "Paid" || to == "Shipped" || to == "Cancelled"
	case "Paid":
		return to == "Shipped" || to == "Cancelled"
	case "Shipped":
		return false
	case "Cancelled":
		return false
	default:
		return false
	}
}
