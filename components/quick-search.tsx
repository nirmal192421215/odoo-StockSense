"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, type ProductRow } from "@/lib/client";

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      if (products.length === 0) {
        setLoading(true);
        api<{ products: ProductRow[] }>("/api/products")
          .then((d) => setProducts(d.products))
          .finally(() => setLoading(false));
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open, products.length]);

  const filtered = products.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <>
      {/* Trigger Button in Sidebar or Navbar */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all"
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          color: "rgba(255, 255, 255, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          marginBottom: 12,
        }}
        title="Quick SKU Search (Ctrl+K or ⌘K)"
      >
        <div className="flex items-center gap-2">
          <span>🔍</span>
          <span>Quick SKU Lookup</span>
        </div>
        <kbd
          className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold"
          style={{ background: "rgba(0, 0, 0, 0.2)", color: "rgba(255, 255, 255, 0.6)" }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Modal Backdrop */}
      {open && (
        <div
          className="fixed inset-0 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          style={{ zIndex: 9999 }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border animate-scale-up"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-light)",
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Box */}
            <div
              className="p-3.5 border-b flex items-center gap-3"
              style={{ borderColor: "var(--border-light)" }}
            >
              <span className="text-lg">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products by SKU or name... (e.g. STEEL, GLOVES)"
                className="w-full bg-transparent text-sm font-medium focus:outline-none"
                style={{ color: "var(--ink)" }}
              />
              <button
                onClick={() => setOpen(false)}
                className="text-xs px-2 py-1 rounded hover:bg-slate-100 font-mono"
                style={{ color: "var(--ink-muted)" }}
              >
                ESC
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 divide-y" style={{ borderColor: "var(--border-light)" }}>
              {loading ? (
                <div className="p-8 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
                  Loading product catalogue…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
                  No matching products found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/products/${p.id}`);
                    }}
                    className="p-3 flex items-center justify-between rounded-lg cursor-pointer transition-all hover:bg-slate-100/70"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand px-1.5 py-0.5 rounded bg-slate-100">
                          {p.sku}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                          {p.name}
                        </span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                        Category: {p.category?.name ?? "General"} • Min Reorder: {p.minQty} {p.uom?.symbol}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold" style={{ color: p.alert ? "#dc2626" : "var(--brand)" }}>
                        {p.onHand} {p.uom?.symbol}
                      </div>
                      {p.alert && (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          {p.alert.kind === "out_of_stock" ? "Out of Stock" : "Low Stock"}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="p-2.5 px-4 bg-slate-50 border-t flex items-center justify-between text-[11px]"
              style={{ borderColor: "var(--border-light)", color: "var(--ink-muted)" }}
            >
              <span>Click to view product quants & location breakdown</span>
              <span className="font-mono text-[10px]">StockSense Ledger Quick-Find</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
