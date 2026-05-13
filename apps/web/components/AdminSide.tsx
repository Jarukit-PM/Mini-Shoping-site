"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "home" as const },
  { label: "Products", href: "/admin/products", icon: "package" as const },
  { label: "Orders", href: "/admin/orders", icon: "truck" as const },
] as const;

export function AdminSide() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <aside className="admin-side">
      <div className="side-label">Navigation</div>
      {NAV_ITEMS.map(({ label, href, icon }) => (
        <Link
          key={href}
          href={href}
          className={`side-link ${isActive(href) ? "active" : ""}`}
        >
          <Icon name={icon} />
          {label}
        </Link>
      ))}
    </aside>
  );
}
