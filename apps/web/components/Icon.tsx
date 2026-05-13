"use client";

import React from "react";

/* ------------------------------------------------------------------
   MERIDIAN icon map — 22 icons, all inline SVG path/shape fragments.
   stroke="currentColor" fill="none" strokeWidth="1.5" set via .icon CSS.
------------------------------------------------------------------ */
const ICONS: Record<string, React.ReactNode> = {
  search:   <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm6-2l4 4" />,
  cart:     <path d="M3 4h2l2.4 11.5a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.5L21 8H6m3 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />,
  user:     <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  bag:      <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3 0V5a3 3 0 0 1 6 0v2" />,
  arrowR:   <path d="M5 12h14m-6-6 6 6-6 6" />,
  arrowL:   <path d="M19 12H5m6-6-6 6 6 6" />,
  plus:     <path d="M12 5v14M5 12h14" />,
  minus:    <path d="M5 12h14" />,
  check:    <path d="M5 13l4 4L19 7" />,
  x:        <path d="M6 6l12 12M6 18L18 6" />,
  alert:    <path d="M12 9v4m0 4h.01M10.3 3.86 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0z" />,
  info:     <><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></>,
  trash:    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6" />,
  edit:     <path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6m-2-9 3 3-11 11H7v-3l11-11z" />,
  box:      <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>,
  truck:    <><path d="M2 6h11v11H2zM13 9h5l3 3v5h-8" /><circle cx="6.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" /></>,
  home:     <path d="M3 12 12 4l9 8v8a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8z" />,
  package:  <><path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v9" /></>,
  filter:   <path d="M3 6h18M6 12h12M10 18h4" />,
  chev:     <path d="m9 6 6 6-6 6" />,
  chevDown: <path d="m6 9 6 6 6-6" />,
  logout:   <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H10" />,
};

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
}

export function Icon({ name, className = "", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`icon ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      {ICONS[name]}
    </svg>
  );
}
