package order

import (
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// LineItem is stored on the order document (historical snapshot).
type LineItem struct {
	ProductID           primitive.ObjectID `bson:"productId" json:"productId"`
	Name                string             `bson:"name" json:"name"`
	Qty                 int32              `bson:"qty" json:"qty"`
	PriceCentsSnapshot  int64              `bson:"priceCentsSnapshot" json:"priceCentsSnapshot"`
	LineTotalCents      int64              `bson:"lineTotalCents" json:"lineTotalCents"`
}

// Totals matches admin list expectations (grand total required).
type Totals struct {
	SubtotalCents   int64 `bson:"subtotalCents" json:"subtotalCents"`
	ShippingCents   int64 `bson:"shippingCents" json:"shippingCents"`
	GrandTotalCents int64 `bson:"grandTotalCents" json:"grandTotalCents"`
}

// ShippingAddress is embedded on the order.
type ShippingAddress struct {
	Name    string `json:"name" bson:"name"`
	Line1   string `json:"line1" bson:"line1"`
	City    string `json:"city" bson:"city"`
	Postal  string `json:"postal" bson:"postal"`
	Country string `json:"country" bson:"country"`
}

// Order is persisted in collection `orders`.
type Order struct {
	ID               primitive.ObjectID `bson:"_id,omitempty"`
	UserID           primitive.ObjectID `bson:"userId"`
	LineItems        []LineItem         `bson:"lineItems"`
	Totals           Totals             `bson:"totals"`
	ShippingAddress  ShippingAddress    `bson:"shippingAddress"`
	Status           string             `bson:"status"`
	PaymentRef       string             `bson:"paymentRef"`
	CreatedAt        time.Time          `bson:"createdAt"`
}

// Common errors from PlaceOrder.
var (
	ErrEmptyCart       = errors.New("empty_cart")
	ErrPaymentDeclined = errors.New("payment_declined")
)

// ErrOutOfStock lists human-readable offending lines (SKU or name).
type ErrOutOfStock struct {
	Details []string
}

func (e *ErrOutOfStock) Error() string { return "out_of_stock" }
