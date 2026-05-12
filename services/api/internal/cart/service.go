package cart

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var ErrOutOfStock = errors.New("out_of_stock")
var ErrProductNotFound = errors.New("product_not_found")

type Service struct{ db *mongo.Database }

func New(db *mongo.Database) *Service { return &Service{db: db} }

// AddItem increments qty for an existing line or appends a new one.
// Always re-reads product stock and snapshots the current price.
func (s *Service) AddItem(ctx context.Context, userID, productID primitive.ObjectID, qty int32) (*Cart, error) {
	if qty <= 0 {
		return nil, errors.New("invalid_qty")
	}

	var p struct {
		Stock      int32 `bson:"stock"`
		PriceCents int64 `bson:"priceCents"`
	}
	err := s.db.Collection("products").FindOne(ctx, bson.M{"_id": productID}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrProductNotFound
	}
	if err != nil {
		return nil, err
	}

	cart, err := s.getOrCreate(ctx, userID)
	if err != nil {
		return nil, err
	}

	existingQty := int32(0)
	for _, it := range cart.Items {
		if it.ProductID == productID {
			existingQty = it.Qty
			break
		}
	}
	if existingQty+qty > p.Stock {
		return nil, ErrOutOfStock
	}

	col := s.db.Collection("carts")
	res, err := col.UpdateOne(ctx,
		bson.M{"userId": userID, "items.productId": productID},
		bson.M{
			"$inc": bson.M{"items.$.qty": qty},
			"$set": bson.M{"items.$.priceCentsSnapshot": p.PriceCents, "updatedAt": time.Now()},
		},
	)
	if err != nil {
		return nil, err
	}
	if res.MatchedCount == 0 {
		_, err = col.UpdateOne(ctx, bson.M{"userId": userID},
			bson.M{
				"$push": bson.M{"items": CartItem{ProductID: productID, Qty: qty, PriceCentsSnapshot: p.PriceCents}},
				"$set":  bson.M{"updatedAt": time.Now()},
			})
		if err != nil {
			return nil, err
		}
	}
	return s.get(ctx, userID)
}

func (s *Service) SetQty(ctx context.Context, userID, productID primitive.ObjectID, qty int32) (*Cart, error) {
	if qty < 0 {
		return nil, errors.New("invalid_qty")
	}
	if qty == 0 {
		return s.RemoveItem(ctx, userID, productID)
	}

	var p struct {
		Stock int32 `bson:"stock"`
	}
	if err := s.db.Collection("products").FindOne(ctx, bson.M{"_id": productID}).Decode(&p); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	if qty > p.Stock {
		return nil, ErrOutOfStock
	}

	_, err := s.db.Collection("carts").UpdateOne(ctx,
		bson.M{"userId": userID, "items.productId": productID},
		bson.M{"$set": bson.M{"items.$.qty": qty, "updatedAt": time.Now()}},
	)
	if err != nil {
		return nil, err
	}
	return s.get(ctx, userID)
}

func (s *Service) RemoveItem(ctx context.Context, userID, productID primitive.ObjectID) (*Cart, error) {
	_, err := s.db.Collection("carts").UpdateOne(ctx,
		bson.M{"userId": userID},
		bson.M{
			"$pull": bson.M{"items": bson.M{"productId": productID}},
			"$set":  bson.M{"updatedAt": time.Now()},
		})
	if err != nil {
		return nil, err
	}
	return s.get(ctx, userID)
}

func (s *Service) Get(ctx context.Context, userID primitive.ObjectID) (*Cart, error) {
	return s.get(ctx, userID)
}

func (s *Service) getOrCreate(ctx context.Context, userID primitive.ObjectID) (*Cart, error) {
	col := s.db.Collection("carts")
	_, err := col.UpdateOne(ctx,
		bson.M{"userId": userID},
		bson.M{"$setOnInsert": bson.M{"userId": userID, "items": []CartItem{}, "updatedAt": time.Now()}},
		options.Update().SetUpsert(true),
	)
	if err != nil {
		return nil, err
	}
	return s.get(ctx, userID)
}

func (s *Service) get(ctx context.Context, userID primitive.ObjectID) (*Cart, error) {
	var c Cart
	err := s.db.Collection("carts").FindOne(ctx, bson.M{"userId": userID}).Decode(&c)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return &Cart{UserID: userID, Items: []CartItem{}}, nil
	}
	return &c, err
}
