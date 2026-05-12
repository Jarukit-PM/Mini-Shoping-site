package auth

import "golang.org/x/crypto/bcrypt"

const bcryptCost = 12

// HashPassword returns a bcrypt hash of plain.
func HashPassword(plain string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(plain), bcryptCost)
}

// ComparePassword returns nil if plain matches hash.
func ComparePassword(hash []byte, plain string) error {
	return bcrypt.CompareHashAndPassword(hash, []byte(plain))
}
