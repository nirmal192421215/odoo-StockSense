"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Alert = {
  id: string;
  kind: "low_stock" | "out_of_stock";
  onHand: number;
  minQty: number;
  product: { name: string; sku: string };
};

export function LowStockBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => {});
  }, []);

  if (!alerts.length) return null;

  const out = alerts.filter((a) => a.kind === "out_of_stock");
  const low = alerts.filter((a) => a.kind === "low_stock");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 10,
        marginBottom: 20,
        background: out.length ? "#fef2f2" : "#fffbeb",
        border: `1px solid ${out.length ? "#fecaca" : "#fde68a"}`,
        fontSize: "0.875rem",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>{out.length ? "🚫" : "⚠️"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: out.length ? "#b91c1c" : "#92400e" }}>
          Shortage alert active.{" "}
        </span>
        <span style={{ color: out.length ? "#dc2626" : "#d97706" }}>
          {out.length > 0 && `${out.length} product${out.length !== 1 ? "s" : ""} out of stock`}
          {out.length > 0 && low.length > 0 && " · "}
          {low.length > 0 && `${low.length} below reorder minimum`}
        </span>
        {alerts.slice(0, 3).map((a) => (
          <span
            key={a.id}
            style={{
              display: "inline-block",
              marginLeft: 8,
              background: a.kind === "out_of_stock" ? "#fecaca" : "#fde68a",
              color: a.kind === "out_of_stock" ? "#b91c1c" : "#92400e",
              borderRadius: 4,
              padding: "1px 6px",
              fontSize: "0.7rem",
              fontWeight: 600,
            }}
          >
            {a.product.sku}
          </span>
        ))}
        {alerts.length > 3 && (
          <span style={{ marginLeft: 6, fontSize: "0.75rem", color: "var(--ink-muted)" }}>
            +{alerts.length - 3} more
          </span>
        )}
      </div>
      <Link
        href="/products"
        style={{
          color: out.length ? "#b91c1c" : "#92400e",
          fontWeight: 600,
          textDecoration: "underline",
          whiteSpace: "nowrap",
          fontSize: "0.8125rem",
        }}
      >
        View products →
      </Link>
    </div>
  );
}
