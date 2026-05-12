package order

import "testing"

func TestErrOutOfStock_Error(t *testing.T) {
	e := &ErrOutOfStock{Details: []string{"a"}}
	if e.Error() != "out_of_stock" {
		t.Fatalf("got %q", e.Error())
	}
}
