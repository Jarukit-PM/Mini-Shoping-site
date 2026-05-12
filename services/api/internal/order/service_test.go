package order

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestShippingFlatCents(t *testing.T) {
	t.Setenv("SHIPPING_FLAT_CENTS", "")
	if n := ShippingFlatCents(); n != 0 {
		t.Fatalf("empty env: got %d", n)
	}
	t.Setenv("SHIPPING_FLAT_CENTS", " 1500 ")
	if n := ShippingFlatCents(); n != 1500 {
		t.Fatalf("parsed: got %d", n)
	}
	t.Setenv("SHIPPING_FLAT_CENTS", "not-a-number")
	if n := ShippingFlatCents(); n != 0 {
		t.Fatalf("invalid: got %d", n)
	}
}

func TestActiveProductFilter(t *testing.T) {
	id := primitive.NewObjectID()
	f := activeProductFilter(id)
	if got, ok := f["_id"].(primitive.ObjectID); !ok || got != id {
		t.Fatalf("_id: got %#v", f["_id"])
	}
	orSlice, ok := f["$or"].([]bson.M)
	if !ok || len(orSlice) != 2 {
		t.Fatalf("$or: %#v", f["$or"])
	}
}
