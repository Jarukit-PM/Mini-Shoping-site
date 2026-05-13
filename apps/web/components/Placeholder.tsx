"use client";

import React from "react";

interface PlaceholderProps {
  label?: string;
  sku?: string;
  tone?: 1 | 2 | 3 | 4 | 5;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function Placeholder({ label, sku, tone = 1, className = "", style, onClick }: PlaceholderProps) {
  return (
    <div className={`ph tone-${tone} ${className}`} style={style} onClick={onClick}>
      {sku && <div className="ph-corner">{sku}</div>}
      {label && <div className="ph-label">{label}</div>}
    </div>
  );
}
