"use client";

import React from "react";
import { Icon } from "./Icon";

interface QtyProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

export function Qty({ value, onChange, min = 1, max = 99 }: QtyProps) {
  return (
    <div className="qty">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Icon name="minus" />
      </button>
      <span className="val">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}
