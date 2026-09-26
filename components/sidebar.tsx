"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { QuickSearch } from "@/components/quick-search";

// ─── SVG Icons ─────────────────────────────────────────────────────────────
const Icon = {
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
    </svg>
  ),
  Box: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
      <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
  ArrowDown: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293 7.293a1 1 0 011.414 0L9 11.586V19a1 1 0 11-2 0v-7.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L9 11.586V19" clipRule="evenodd" />
    </svg>
  ),
  Shuffle: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
    </svg>
  ),
  Adjust: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
    </svg>
  ),
  History: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  ),
  Map: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.553.894l4 2A1 1 0 007 17V4.414L3.707 3.293zM13 17a1 1 0 00.447-.106l4-2A1 1 0 0018 14V4a1 1 0 00-.553-.894l-4-2A1 1 0 0013 2v15z" clipRule="evenodd" />
    </svg>
  ),
  Kanban: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  ),
  Logout: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
  ),
  Menu: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

type NavItem = {
  href: string;
  label: string;
  icon: () => React.ReactNode;
};

const nav: NavItem[] = [
  { href: "/dashboard",              label: "Dashboard",       icon: Icon.Dashboard },
  { href: "/operations/map",         label: "Warehouse Map",   icon: Icon.Map },
  { href: "/products",               label: "Products",        icon: Icon.Box },
  { href: "/operations/receipts",    label: "Receipts",        icon: Icon.ArrowDown },
  { href: "/operations/deliveries",  label: "Deliveries",      icon: Icon.ArrowUp },
  { href: "/operations/transfers",   label: "Transfers",       icon: Icon.Shuffle },
  { href: "/operations/adjustments", label: "Adjustments",     icon: Icon.Adjust },
  { href: "/operations/history",     label: "Move History",    icon: Icon.History },
  { href: "/operations/kanban",      label: "Kanban",          icon: Icon.Kanban },
];

const bottomNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Icon.Settings },
  { href: "/profile",  label: "Profile",  icon: Icon.User },
];

export function Sidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null; role: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        className={`sidebar-link${active ? " active" : ""}`}
        title={item.label}
      >
        <span style={{ opacity: active ? 1 : 0.75 }}>
          <item.icon />
        </span>
        <span>{item.label}</span>
      </Link>
    );
  }

  const roleLabel = user.role === "inventory_manager" ? "Inventory Manager" : "Warehouse Staff";
  const initials = (user.name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="no-print fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-[#714b67] text-white shadow-lg md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {open ? <Icon.Close /> : <Icon.Menu />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="no-print fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar no-print${open ? " open" : ""}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              SS
            </div>
            <div>
              <div className="sidebar-brand-name">StockSense</div>
              <div className="sidebar-brand-sub">Inventory Engine</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <QuickSearch />
          <div className="sidebar-section-label">Workspace</div>
          {nav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          <div className="sidebar-section-label" style={{ marginTop: 8 }}>Account</div>
          {bottomNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="flex items-center gap-3 mb-3">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name}
              </div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-sm w-full"
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              justifyContent: "flex-start",
              gap: 8,
            }}
          >
            <Icon.Logout />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
