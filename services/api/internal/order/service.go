package order

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/cart"
	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/catalog"
	"github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/payment"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const ordersCollection = "orders"

func activeProductFilter(id primitive.ObjectID) bson.M {
	return bson.M{
		"_id": id,
		"$or": []bson.M{
			{"deletedAt": nil},
			{"deletedAt": bson.M{"$exists": false}},
		},
	}
}

// ShippingFlatCents from env SHIPPING_FLAT_CENTS (default 0).
func ShippingFlatCents() int64 {
	v := strings.TrimSpace(os.Getenv("SHIPPING_FLAT_CENTS"))
	if v == "" {
		return 0
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return 0
	}
	return n
}

// PlaceOrderInput is the validated checkout payload.
type PlaceOrderInput struct {
	ShippingAddress ShippingAddress
	CardNumber      string
}

// PlaceOrder runs UC-05: cart → stock check → charge → apply order (stock decrement + insert + clear cart).
// This path does not use Mongo multi-document transactions so it works on a **standalone** mongod
// (transactions require a replica set or sharded cluster).
func PlaceOrder(ctx context.Context, db *mongo.Database, userID primitive.ObjectID, in PlaceOrderInput) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	d, err := cart.GetByUserID(ctx, db, userID)
	if err != nil {
		return primitive.NilObjectID, err
	}
	if d == nil || len(d.Items) == 0 {
		return primitive.NilObjectID, ErrEmptyCart
	}

	var lines []LineItem
	var details []string
	var subtotal int64
	products := db.Collection("products")

	for _, it := range d.Items {
		var p catalog.Product
		err := products.FindOne(ctx, activeProductFilter(it.ProductID)).Decode(&p)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				details = append(details, fmt.Sprintf("missing product %s", it.ProductID.Hex()))
				continue
			}
			return primitive.NilObjectID, err
		}
		if p.Stock < it.Qty {
			details = append(details, fmt.Sprintf("%s (%s): need %d, have %d", p.Name, p.SKU, it.Qty, p.Stock))
			continue
		}
		lineTotal := int64(it.Qty) * p.PriceCents
		lines = append(lines, LineItem{
			ProductID:          p.ID,
			Name:               p.Name,
			Qty:                it.Qty,
			PriceCentsSnapshot: p.PriceCents,
			LineTotalCents:     lineTotal,
		})
		subtotal += lineTotal
	}
	if len(details) > 0 {
		return primitive.NilObjectID, &ErrOutOfStock{Details: details}
	}
	if len(lines) == 0 {
		return primitive.NilObjectID, ErrEmptyCart
	}

	shipping := ShippingFlatCents()
	grand := subtotal + shipping

	pay, err := payment.Charge(in.CardNumber, grand)
	if err != nil {
		return primitive.NilObjectID, err
	}
	if !pay.OK {
		return primitive.NilObjectID, ErrPaymentDeclined
	}

	now := time.Now().UTC()
	ord := Order{
		UserID:          userID,
		LineItems:       lines,
		Totals:          Totals{SubtotalCents: subtotal, ShippingCents: shipping, GrandTotalCents: grand},
		ShippingAddress: in.ShippingAddress,
		Status:          "Paid",
		PaymentRef:      pay.Ref,
		CreatedAt:       now,
	}

	orders := db.Collection(ordersCollection)

	var decremented []LineItem
	rollbackStock := func() {
		for _, line := range decremented {
			_, _ = products.UpdateOne(ctx,
				bson.M{"_id": line.ProductID},
				bson.M{"$inc": bson.M{"stock": line.Qty}},
			)
		}
		decremented = decremented[:0]
	}

	for _, line := range lines {
		ur, err := products.UpdateOne(ctx,
			bson.M{"_id": line.ProductID, "stock": bson.M{"$gte": line.Qty}},
			bson.M{"$inc": bson.M{"stock": -line.Qty}},
		)
		if err != nil {
			rollbackStock()
			return primitive.NilObjectID, err
		}
		if ur.MatchedCount == 0 {
			rollbackStock()
			return primitive.NilObjectID, &ErrOutOfStock{Details: []string{fmt.Sprintf("stock changed for %s", line.Name)}}
		}
		decremented = append(decremented, line)
	}

	res, err := orders.InsertOne(ctx, ord)
	if err != nil {
		rollbackStock()
		return primitive.NilObjectID, err
	}
	oid, ok := res.InsertedID.(primitive.ObjectID)
	if !ok {
		rollbackStock()
		return primitive.NilObjectID, fmt.Errorf("invalid inserted id")
	}

	if err := cart.Clear(ctx, db, userID); err != nil {
		_, _ = orders.DeleteOne(ctx, bson.M{"_id": oid})
		rollbackStock()
		return primitive.NilObjectID, err
	}

	return oid, nil
}
