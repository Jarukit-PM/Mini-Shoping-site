package order

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/auth"
	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type paymentBody struct {
	CardNumber string `json:"cardNumber"`
	Expiry     string `json:"expiry"`
	CVV        string `json:"cvv"`
}

type placeOrderBody struct {
	ShippingAddress ShippingAddress `json:"shippingAddress"`
	Payment         paymentBody     `json:"payment"`
}

type placeOrderResponse struct {
	OrderID string `json:"orderId"`
	Status  string `json:"status"`
}

type orderSummaryJSON struct {
	ID              string `json:"id"`
	Status          string `json:"status"`
	CreatedAt       string `json:"createdAt"`
	GrandTotalCents int64  `json:"grandTotalCents"`
}

type listOrdersResponse struct {
	Items []orderSummaryJSON `json:"items"`
}

// EnsureIndexes creates an index for listing a user's orders.
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	_, err := db.Collection(ordersCollection).Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}},
	})
	return err
}

// RegisterRoutes mounts /orders under /v1 (caller adds RequireAuth).
func RegisterRoutes(r chi.Router, db *mongo.Database) {
	r.Post("/orders", postOrder(db))
	r.Get("/orders", listMine(db))
	r.Get("/orders/{id}", getMine(db))
}

func postOrder(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		userID, ok := userIDFromReq(req)
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
			return
		}
		var body placeOrderBody
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_json", "request body must be JSON")
			return
		}
		if strings.TrimSpace(body.ShippingAddress.Name) == "" || strings.TrimSpace(body.ShippingAddress.Line1) == "" {
			httpx.WriteError(w, http.StatusBadRequest, "missing_field", "shipping address name and line1 are required")
			return
		}
		card := strings.TrimSpace(body.Payment.CardNumber)
		if card == "" {
			httpx.WriteError(w, http.StatusBadRequest, "missing_field", "payment.cardNumber is required")
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 45*time.Second)
		defer cancel()
		id, err := PlaceOrder(ctx, db, userID, PlaceOrderInput{
			ShippingAddress: body.ShippingAddress,
			CardNumber:      card,
		})
		if err != nil {
			switch {
			case errors.Is(err, ErrEmptyCart):
				httpx.WriteError(w, http.StatusBadRequest, "empty_cart", "cart is empty")
				return
			case errors.Is(err, ErrPaymentDeclined):
				httpx.WriteError(w, http.StatusPaymentRequired, "payment_declined", "payment was declined")
				return
			default:
				var oos *ErrOutOfStock
				if errors.As(err, &oos) {
					httpx.WriteErrorDetails(w, http.StatusConflict, "out_of_stock", "insufficient stock", oos.Details)
					return
				}
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", err.Error())
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, placeOrderResponse{OrderID: id.Hex(), Status: "Paid"})
	}
}

func listMine(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		userID, ok := userIDFromReq(req)
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 15*time.Second)
		defer cancel()
		cur, err := db.Collection(ordersCollection).Find(ctx, bson.M{"userId": userID}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not list orders")
			return
		}
		defer func() { _ = cur.Close(ctx) }()
		var docs []Order
		if err := cur.All(ctx, &docs); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not decode orders")
			return
		}
		out := make([]orderSummaryJSON, 0, len(docs))
		for _, o := range docs {
			out = append(out, orderSummaryJSON{
				ID:              o.ID.Hex(),
				Status:          o.Status,
				CreatedAt:       o.CreatedAt.UTC().Format(time.RFC3339),
				GrandTotalCents: o.Totals.GrandTotalCents,
			})
		}
		httpx.WriteJSON(w, http.StatusOK, listOrdersResponse{Items: out})
	}
}

func getMine(db *mongo.Database) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		userID, ok := userIDFromReq(req)
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
			return
		}
		idHex := chi.URLParam(req, "id")
		oid, err := primitive.ObjectIDFromHex(idHex)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_id", "invalid order id")
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		var o Order
		err = db.Collection(ordersCollection).FindOne(ctx, bson.M{"_id": oid}).Decode(&o)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				httpx.WriteError(w, http.StatusNotFound, "not_found", "order not found")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "database_error", "could not load order")
			return
		}
		if o.UserID != userID {
			httpx.WriteError(w, http.StatusForbidden, "forbidden", "not your order")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, orderToJSON(o))
	}
}

func userIDFromReq(req *http.Request) (primitive.ObjectID, bool) {
	idHex := auth.UserID(req.Context())
	if idHex == "" {
		return primitive.NilObjectID, false
	}
	oid, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		return primitive.NilObjectID, false
	}
	return oid, true
}

func orderToJSON(o Order) map[string]any {
	lineItems := make([]map[string]any, 0, len(o.LineItems))
	for _, li := range o.LineItems {
		lineItems = append(lineItems, map[string]any{
			"productId":           li.ProductID.Hex(),
			"name":                li.Name,
			"qty":                 li.Qty,
			"priceCentsSnapshot":  li.PriceCentsSnapshot,
			"lineTotalCents":      li.LineTotalCents,
		})
	}
	return map[string]any{
		"id":                o.ID.Hex(),
		"userId":            o.UserID.Hex(),
		"lineItems":         lineItems,
		"totals":            o.Totals,
		"shippingAddress":   o.ShippingAddress,
		"status":            o.Status,
		"paymentRef":        o.PaymentRef,
		"createdAt":         o.CreatedAt.UTC().Format(time.RFC3339),
	}
}
