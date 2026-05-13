"use client";

import React from "react";
import type { OrderStatus } from "@/lib/orders";

interface StatusProps {
  value: OrderStatus | string;
}

export function Status({ value }: StatusProps) {
  const v = (value ?? "").toLowerCase();
  return <span className={`status ${v}`}>{value}</span>;
}
