"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { ConfirmModal } from "./ConfirmModal";
import { useCart, useCartCount } from "./CartProvider";
import { apiBaseUrl } from "@/lib/api";

export function TopBar() {
  const pathname = usePathname();
  const { openDrawer } = useCart();
  const cartCount = useCartCount();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch(`${apiBaseUrl()}/v1/auth/me`, { credentials: "include", cache: "no-store" })
      .then((r) => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch(`${apiBaseUrl()}/v1/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      /* still clear local auth state */
    }
    setLoggedIn(false);
    setLogoutOpen(false);
    setLoggingOut(false);
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="topbar">
      {/* Left nav */}
      <nav className="topbar-left">
        <Link href="/" className={pathname === "/" ? "active" : ""}>
          Shop
        </Link>
        <Link href="/orders" className={isActive("/orders") ? "active" : ""}>
          Orders
        </Link>
      </nav>

      {/* Wordmark */}
      <Link href="/" className="wordmark">
        MERIDIAN<span className="dot">.</span>
      </Link>

      {/* Right actions */}
      <div className="topbar-right">
        {loggedIn === true ? (
          <button className="icon-btn" type="button" onClick={() => setLogoutOpen(true)}>
            Log out
          </button>
        ) : loggedIn === false ? (
          <Link href="/login" className="icon-btn">
            Log in
          </Link>
        ) : null}
        <button className="icon-btn" onClick={openDrawer}>
          <Icon name="bag" />
          Cart
          {cartCount > 0 && (
            <span
              style={{
                background: "var(--ink)",
                color: "var(--bg)",
                borderRadius: 999,
                padding: "1px 7px",
                fontSize: 11,
              }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <ConfirmModal
        open={logoutOpen}
        title="Log out?"
        body="You will need to sign in again to view orders or check out."
        confirmLabel={loggingOut ? "Logging out…" : "Log out"}
        danger
        onCancel={() => {
          if (!loggingOut) setLogoutOpen(false);
        }}
        onConfirm={() => {
          if (!loggingOut) void logout();
        }}
      />
    </header>
  );
}
