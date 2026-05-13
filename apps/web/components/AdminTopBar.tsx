"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { apiBaseUrl } from "@/lib/api";

export function AdminTopBar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch(`${apiBaseUrl()}/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors — redirect anyway
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="topbar" style={{ padding: "14px 32px" }}>
      <div className="topbar-left">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="wordmark" style={{ fontSize: 16, letterSpacing: "0.16em" }}>
            MERIDIAN<span className="dot">.</span>
          </div>
          <span
            className="muted tiny"
            style={{
              paddingLeft: 10,
              borderLeft: "1px solid var(--line-2)",
              marginLeft: 4,
            }}
          >
            Admin Console
          </span>
        </div>
      </div>

      <div />

      <div className="topbar-right">
        <button className="btn ghost sm" onClick={handleLogout}>
          <Icon name="logout" /> Logout
        </button>
      </div>
    </header>
  );
}
