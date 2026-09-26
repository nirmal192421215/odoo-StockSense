"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LowStockBanner } from "@/components/low-stock-banner";
import { StatusPill, selectClass, Spinner, EmptyState } from "@/components/ui";
import { api, opPath, type Master, type PickingRow, type PickingState, type PickingType } from "@/lib/client";

type Dash = {
  kpis: {
    productsInStock: number;
    lowStock: number;
    outOfStock: number;
    pendingReceipts: number;
    pendingDeliveries: number;
    scheduledInternals: number;
  };
  activity: PickingRow[];
};

type KpiDef = {
  label: string;
  key: keyof Dash["kpis"];
  icon: string;
  colorClass?: string;
};

const kpiDefs: KpiDef[] = [
  { label: "In Stock",          key: "productsInStock",  icon: "📦" },
  { label: "Low Stock",         key: "lowStock",         icon: "⚠️",  colorClass: "kpi-warn" },
  { label: "Out of Stock",      key: "outOfStock",       icon: "🚫",  colorClass: "kpi-danger" },
  { label: "Pending Receipts",  key: "pendingReceipts",  icon: "📥" },
  { label: "Pending Deliveries",key: "pendingDeliveries",icon: "📤" },
  { label: "Scheduled Internals",key:"scheduledInternals",icon: "🔄" },
];

export default function DashboardPage() {
  const [master, setMaster] = useState<Master | null>(null);
  const [dash, setDash] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [state, setState] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    api<Master>("/api/master").then(setMaster);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (type)        q.set("type", type);
    if (state)       q.set("state", state);
    if (warehouseId) q.set("warehouseId", warehouseId);
    if (locationId)  q.set("locationId", locationId);
    if (categoryId)  q.set("categoryId", categoryId);
    api<Dash>(`/api/dashboard?${q}`)
      .then(setDash)
      .finally(() => setLoading(false));
  }, [type, state, warehouseId, locationId, categoryId]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1280 }}>
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm" style={{ color: "var(--ink-muted)", marginTop: 4 }}>
          Live inventory overview — refreshes on demand
        </p>
      </div>

      {/* ─── Low-stock banner ───────────────────────────────────────── */}
      <LowStockBanner />

      {/* ─── KPI Cards ──────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {kpiDefs.map((def) => {
          const value = dash?.kpis[def.key] ?? "—";
          const isAlert = (def.colorClass === "kpi-warn" && (value as number) > 0) ||
                          (def.colorClass === "kpi-danger" && (value as number) > 0);
          return (
            <div
              key={def.key}
              className="kpi-card"
              style={isAlert ? { borderTop: "3px solid" + (def.colorClass === "kpi-danger" ? " #dc2626" : " #d97706") } : {}}
            >
              <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{def.icon}</div>
              <div className="kpi-label">{def.label}</div>
              <div
                className="kpi-value"
                style={
                  isAlert
                    ? { color: def.colorClass === "kpi-danger" ? "#dc2626" : "#d97706" }
                    : {}
                }
              >
                {loading ? "—" : value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Filters ────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: "14px 16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <select className={selectClass()} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All operations</option>
          {(["receipt", "delivery", "internal", "adjustment"] as PickingType[]).map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select className={selectClass()} value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">All statuses</option>
          {(["draft", "waiting", "ready", "done", "canceled"] as PickingState[]).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select className={selectClass()} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          <option value="">All warehouses</option>
          {master?.warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
          ))}
        </select>
        <select className={selectClass()} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">All locations</option>
          {master?.locations.map((l) => (
            <option key={l.id} value={l.id}>{l.completeName}</option>
          ))}
        </select>
        <select className={selectClass()} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {master?.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ─── Activity Table ──────────────────────────────────────────── */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Recent Activity</span>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
            {dash?.activity.length ?? 0} document{dash?.activity.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <Spinner />
        ) : !dash?.activity.length ? (
          <EmptyState
            icon="📋"
            title="No activity yet"
            subtitle="Create a receipt or delivery to get started."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Partner</th>
                  <th>Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {dash.activity.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/operations/${opPath(row.type)}/${row.id}`}
                        className="link-brand"
                        style={{ fontWeight: 600 }}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td>
                      <span style={{ color: "var(--ink-muted)", fontSize: "0.8125rem" }}>
                        {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
                      </span>
                    </td>
                    <td><StatusPill state={row.state} /></td>
                    <td style={{ color: "var(--ink-muted)", fontSize: "0.8125rem" }}>
                      {row.partner?.name ?? <span style={{ color: "var(--ink-faint)" }}>—</span>}
                    </td>
                    <td style={{ color: "var(--ink-muted)", fontSize: "0.8125rem" }}>
                      {row.warehouse?.code ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
