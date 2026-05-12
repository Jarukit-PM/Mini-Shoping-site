"use client"
import React from "react"

export default function QtyInput({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return <input type="number" min={min} value={value} onChange={e => onChange(Number(e.target.value) || min)} className="w-20 rounded border px-2 py-1" />
}
