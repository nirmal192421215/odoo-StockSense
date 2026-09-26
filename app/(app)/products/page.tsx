"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertBadge, Button, PageHeader, EmptyState, Spinner, selectClass, inputClass } from "@/components/ui";
import { api, type Master, type ProductRow } from "@/lib/client";

export default function ProductsPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "inventory_manager";
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [master, setMaster] = useState<Master | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Master>("/api/master").then(setMaster);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    api<{ products: ProductRow[] }>(`/api/products?${params}`)
      .then((d) => setProducts(d.products))
      .finally(() => setLoading(false));
  }, [q, categoryId]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1280 }}>
      <PageHeader
        title="Products"
        subtitle={`${products.length} product${products.length !== 1 ? "s" : ""} in catalogue`}
        actions={
          isManager ? (
            <Link href="/products/new">
              <Button>+ Create product</Button>
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: "12px 16px",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <input
          className={inputClass()}
          style={{ maxWidth: 260 }}
          placeholder="🔍  Search SKU or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={selectClass()}
          style={{ maxWidth: 200 }}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">All categories</option>
          {master?.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {(q || categoryId) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setQ(""); setCategoryId(""); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No products found"
            subtitle={q || categoryId ? "Try adjusting your search filters." : "Create your first product to get started."}
            action={
              isManager ? (
                <Link href="/products/new">
                  <Button size="sm">Create product</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>UoM</th>
                  <th style={{ textAlign: "right" }}>On hand</th>
                  <th style={{ textAlign: "right" }}>Min qty</th>
                  <th>Stock status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const atMin = p.onHand <= p.minQty && p.minQty > 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link className="link-brand" href={`/products/${p.id}`} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                          {p.sku}
                        </Link>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td style={{ color: "var(--ink-muted)", fontSize: "0.8125rem" }}>
                        {p.category?.name ?? "—"}
                      </td>
                      <td style={{ color: "var(--ink-muted)", fontSize: "0.8125rem" }}>
                        {p.uom?.name ?? "—"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: atMin ? "var(--status-waiting)" : "inherit" }}>
                        {p.onHand} <span style={{ fontWeight: 400, color: "var(--ink-muted)", fontSize: "0.75rem" }}>{p.uom?.symbol}</span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--ink-muted)", fontSize: "0.8125rem" }}>
                        {p.minQty}
                      </td>
                      <td>
                        <AlertBadge kind={p.alert?.kind ?? null} />
                        {!p.alert && <span style={{ color: "var(--status-done)", fontSize: "0.75rem", fontWeight: 600 }}>✓ OK</span>}
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
