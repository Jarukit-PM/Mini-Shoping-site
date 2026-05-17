package catalog

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestAtoiOr(t *testing.T) {
	cases := []struct {
		input string
		def   int
		want  int
	}{
		{"", 5, 5},
		{"42", 0, 42},
		{"-1", 0, -1},
		{"abc", 7, 7},
		{"  ", 3, 3},
		{"0", 99, 0},
	}
	for _, tc := range cases {
		if got := atoiOr(tc.input, tc.def); got != tc.want {
			t.Errorf("atoiOr(%q, %d) = %d, want %d", tc.input, tc.def, got, tc.want)
		}
	}
}

func TestActiveProductFilter(t *testing.T) {
	id := primitive.NewObjectID()
	f := activeProductFilter(id)

	got, ok := f["_id"].(primitive.ObjectID)
	if !ok || got != id {
		t.Fatalf("_id: expected %v, got %#v", id, f["_id"])
	}
	orSlice, ok := f["$or"].([]bson.M)
	if !ok || len(orSlice) != 2 {
		t.Fatalf("$or: expected 2-element slice, got %#v", f["$or"])
	}
	_, hasDeletedAtNil := orSlice[0]["deletedAt"]
	_, hasDeletedAtExists := orSlice[1]["deletedAt"]
	if !hasDeletedAtNil || !hasDeletedAtExists {
		t.Fatalf("$or clauses should both check deletedAt, got %v", orSlice)
	}
}

func TestValidateAdminProductCreate(t *testing.T) {
	cases := []struct {
		name        string
		body        adminProductRequest
		wantFields  []string
		wantClean   bool
	}{
		{
			name:      "valid name and sku",
			body:      adminProductRequest{Name: "Widget", SKU: "WGT-1"},
			wantClean: true,
		},
		{
			name:       "missing name",
			body:       adminProductRequest{SKU: "WGT-1"},
			wantFields: []string{"name"},
		},
		{
			name:       "missing sku",
			body:       adminProductRequest{Name: "Widget"},
			wantFields: []string{"sku"},
		},
		{
			name:       "both missing",
			body:       adminProductRequest{},
			wantFields: []string{"name", "sku"},
		},
		{
			name:       "whitespace-only name",
			body:       adminProductRequest{Name: "   ", SKU: "WGT"},
			wantFields: []string{"name"},
		},
		{
			name:       "whitespace-only sku",
			body:       adminProductRequest{Name: "Widget", SKU: "  "},
			wantFields: []string{"sku"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			errs := validateAdminProductCreate(tc.body)
			if tc.wantClean && len(errs) != 0 {
				t.Errorf("expected no errors, got %v", errs)
				return
			}
			for _, f := range tc.wantFields {
				if _, ok := errs[f]; !ok {
					t.Errorf("expected error for field %q, got map %v", f, errs)
				}
			}
		})
	}
}

func TestProductToJSON(t *testing.T) {
	id := primitive.NewObjectID()
	p := Product{
		ID:          id,
		Name:        "Notebook",
		Description: "Lined A5",
		Category:    "stationery",
		ImageURL:    "https://example.com/nb.png",
		PriceCents:  2500,
		Currency:    "THB",
		SKU:         "NB-001",
		Stock:       10,
	}
	j := productToJSON(p)

	if j.ID != id.Hex() {
		t.Errorf("ID: want %s, got %s", id.Hex(), j.ID)
	}
	if j.Name != p.Name {
		t.Errorf("Name: want %q, got %q", p.Name, j.Name)
	}
	if j.Description != p.Description {
		t.Errorf("Description mismatch")
	}
	if j.Category != p.Category {
		t.Errorf("Category mismatch")
	}
	if j.ImageURL != p.ImageURL {
		t.Errorf("ImageURL mismatch")
	}
	if j.PriceCents != p.PriceCents {
		t.Errorf("PriceCents: want %d, got %d", p.PriceCents, j.PriceCents)
	}
	if j.Currency != p.Currency {
		t.Errorf("Currency mismatch")
	}
	if j.SKU != p.SKU {
		t.Errorf("SKU mismatch")
	}
	if j.Stock != p.Stock {
		t.Errorf("Stock: want %d, got %d", p.Stock, j.Stock)
	}
}
