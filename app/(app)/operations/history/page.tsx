"use client";

import { useEffect, useState } from "react";
import { PageHeader, EmptyState, Spinner, selectClass, inputClass } from "@/components/ui";
import { api, type Master, type PickingType, type ProductRow } from "@/lib/client";

type LedgerRow = {
  id: string;
  occurredAt: string;
  product: { sku: string; name: string };
  from: { completeName: string };
  to: { completeName: string };
  qty: number;
  pickingName: string;
  type: PickingType;
  user: string;
  reason: string | null;
};

const typeColor: Record<PickingType, { bg: string; color: string; label: string }> = {
  receipt:    { bg: "#f0fdf4", color: "#16a34a", label: "Receipt" },
  delivery:   { bg: "#eff6ff", color: "#2563eb", label: "Delivery" },
  internal:   { bg: "#f5f3ff", color: "#7c3aed", label: "Transfer" },
  adjustment: { bg: "#fffbeb", color: "#d97706", label: "Adjustment" },
};

export default function HistoryPage() {
  const [master, setMaster]     = useState<Master | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [rows, setRows]         = useState<LedgerRow[] | null>(null);
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [type, setType]           = useState("");
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");

  useEffect(() => {
    api<Master>("/api/master").then(setMaster);
    api<{ products: ProductRow[] }>("/api/products").then((d) => setProducts(d.products));
  }, []);

  useEffect(() => {
    setRows(null);
    const q = new URLSearchParams();
    if (productId)  q.set("productId", productId);
    if (locationId) q.set("locationId", locationId);
    if (type)       q.set("type", type);
    if (from)       q.set("from", from);
    if (to)         q.set("to", to);
    api<{ ledger: LedgerRow[] }>(`/api/ledger?${q}`).then((d) => setRows(d.ledger));
  }, [productId, locationId, type, from, to]);

  const hasFilters = !!(productId || locationId || type || from || to);

  function clearFilters() {
    setProductId(""); setLocationId(""); setType(""); setFrom(""); setTo("");
  }

  function fmtDate(s: string) {
    const d = new Date(s);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function exportCSV() {
    if (!rows || rows.length === 0) return;
    const headers = [
      "Timestamp",
      "Document Ref",
      "Operation Type",
      "Product SKU",
      "Product Name",
      "Quantity",
      "From Location",
      "To Location",
      "User",
      "Reason",
    ];
    const csvRows = [headers.join(",")];
    for (const r of rows) {
      csvRows.push(
        [
          `"${r.occurredAt}"`,
          `"${r.pickingName}"`,
          `"${r.type}"`,
          `"${r.product.sku}"`,
          `"${r.product.name.replace(/"/g, '""')}"`,
          r.qty,
          `"${r.from.completeName}"`,
          `"${r.to.completeName}"`,
          `"${r.user}"`,
          `"${(r.reason || "").replace(/"/g, '""')}"`,
        ].join(",")
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stocksense_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1440 }}>
      <PageHeader
        title="Move History"
        subtitle="Append-only ledger — every stock movement, permanently recorded"
        actions={
          rows && rows.length > 0 ? (
            <button
              onClick={exportCSV}
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          ) : undefined
        }
      />

      {/* ─── Filters ────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: "14px 16px",
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
          alignItems: "end",
        }}
      >
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Product
          </div>
          <select className={selectClass()} value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Location
          </div>
          <select className={selectClass()} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">All locations</option>
            {master?.locations.map((l) => (
              <option key={l.id} value={l.id}>{l.completeName}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Type
          </div>
          <select className={selectClass()} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {(["receipt", "delivery", "internal", "adjustment"] as PickingType[]).map((t) => (
              <option key={t} value={t}>{typeColor[t].label}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            From date
          </div>
          <input className={inputClass()} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            To date
          </div>
          <input className={inputClass()} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ alignSelf: "end" }}>
            Clear filters
          </button>
        )}
      </div>

      {/* ─── Results summary ─────────────────────────────────────────── */}
      {rows !== null && rows.length > 0 && (
        <div style={{ marginBottom: 12, fontSize: "0.8125rem", color: "var(--ink-muted)" }}>
          {rows.length} ledger entr{rows.length !== 1 ? "ies" : "y"}
          {hasFilters ? " (filtered)" : ""}
        </div>
      )}

      {/* ─── Table ───────────────────────────────────────────────────── */}
      <div className="card" style={{ overflow: "hidden" }}>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No ledger entries yet"
            subtitle={hasFilters ? "No movements match your filters." : "Validate a picking to create the first ledger entry."}
            action={hasFilters ? (
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear filters</button>
            ) : undefined}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th>From</th>
                  <th style={{ textAlign: "center" }}>→</th>
                  <th>To</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th>User</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const tc = typeColor[r.type];
                  return (
                    <tr key={r.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ink-muted)", fontSize: "0.8rem" }}>
                        {fmtDate(r.occurredAt)}
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600, color: "var(--brand)" }}>
                          {r.pickingName}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: tc.bg,
                            color: tc.color,
                            borderRadius: 4,
                            padding: "2px 8px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tc.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{r.product.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--ink-muted)" }}>
                          {r.product.sku}
                        </div>
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--ink-muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.from.completeName}
                      </td>
                      <td style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: "0.8rem" }}>→</td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--ink-muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.to.completeName}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>
                        {Number(r.qty).toFixed(2)}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>{r.user}</td>
                      <td style={{ fontSize: "0.8rem" }}>
                        {r.reason ? (
                          <span
                            style={{
                              background: "var(--brand-lighter)",
                              color: "var(--brand-dark)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: "0.75rem",
                            }}
                          >
                            {r.reason}
                          </span>
                        ) : (
                          <span style={{ color: "var(--ink-faint)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
