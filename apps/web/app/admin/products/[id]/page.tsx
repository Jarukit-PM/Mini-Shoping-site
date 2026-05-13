"use client";

import React, { use, useEffect, useState } from "react";
import { AdminProductForm } from "@/components/AdminProductForm";
import { listAllProducts, type AdminProduct } from "@/lib/admin-products";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<AdminProduct | null | "loading">("loading");

  useEffect(() => {
    listAllProducts().then((all) => {
      const found = all.find((p) => p.id === id);
      setProduct(found ?? null);
    });
  }, [id]);

  if (product === "loading") return null;
  if (!product) {
    return (
      <div className="empty">
        <div className="h-3">Product not found</div>
      </div>
    );
  }

  return <AdminProductForm existing={product} />;
}
