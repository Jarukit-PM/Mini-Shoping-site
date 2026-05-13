import React from "react";
import { TopBar } from "@/components/TopBar";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <TopBar />
      {children}
    </div>
  );
}
