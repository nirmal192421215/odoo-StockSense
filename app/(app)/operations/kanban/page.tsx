"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, StatusPill, Spinner, EmptyState, selectClass } from "@/components/ui";
import { api, opPath, type PickingRow, type PickingState, type PickingType } from "@/lib/client";

const columns: { state: PickingState; label: string; color: string; bg: string }[] = [
  { state: "draft", label: "Draft", color: "var(--ink-muted)", bg: "rgba(100, 116, 139, 0.08)" },
  { state: "waiting", label: "Waiting", color: "#d97706", bg: "rgba(245, 158, 11, 0.1)" },
  { state: "ready", label: "Ready", color: "var(--brand)", bg: "rgba(113, 75, 103, 0.1)" },
  { state: "done", label: "Done", color: "#16a34a", bg: "rgba(22, 163, 74, 0.1)" },
  { state: "canceled", label: "Canceled", color: "#dc2626", bg: "rgba(220, 38, 38, 0.08)" },
];

const typeBadge: Record<PickingType, { label: string; bg: string; color: string }> = {
  receipt: { label: "Receipt", bg: "rgba(22, 163, 74, 0.1)", color: "#15803d" },
  delivery: { label: "Delivery", bg: "rgba(37, 99, 235, 0.1)", color: "#1d4ed8" },
  internal: { label: "Transfer", bg: "rgba(124, 58, 237, 0.1)", color: "#6d28d9" },
  adjustment: { label: "Adjustment", bg: "rgba(217, 119, 6, 0.1)", color: "#b45309" },
};

function KanbanContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "";
  const [rows, setRows] = useState<PickingRow[] | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>(initialType);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    api<{ pickings: PickingRow[] }>("/api/pickings").then((d) => setRows(d.pickings));
  }, []);

  if (!rows) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Operations Kanban"
          subtitle="Real-time pipeline across all warehouse movements"
        />
        <Spinner />
      </div>
    );
  }

  const filtered = rows.filter((r) => {
    if (typeFilter && r.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchPartner = r.partner?.name?.toLowerCase().includes(q);
      const matchWarehouse = r.warehouse?.name?.toLowerCase().includes(q) || r.warehouse?.code?.toLowerCase().includes(q);
      if (!matchName && !matchPartner && !matchWarehouse) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Operations Kanban"
        subtitle={`Live visual pipeline of warehouse operations (${rows.length} total)`}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href={typeFilter ? `/operations/${opPath(typeFilter as PickingType)}` : `/operations/receipts`}
              className="btn btn-secondary btn-sm"
              title="Switch back to tabular list view"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span>📋</span> List View
            </Link>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium hidden sm:inline-block"
              style={{
                background: "rgba(113, 75, 103, 0.08)",
                color: "var(--brand)",
                border: "1px solid rgba(113, 75, 103, 0.2)",
              }}
            >
              Strict ERP Validation Workflow
            </span>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search reference, partner, warehouse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input text-sm py-1.5 pl-8 pr-3 w-full"
            />
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: "var(--ink-muted)" }}
            >
              🔍
            </span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={selectClass("text-sm py-1.5 max-w-[180px]")}
          >
            <option value="">All Operation Types</option>
            <option value="receipt">Receipts</option>
            <option value="delivery">Deliveries</option>
            <option value="internal">Internal Transfers</option>
            <option value="adjustment">Adjustments</option>
          </select>
        </div>

        {(typeFilter || search) && (
          <button
            onClick={() => {
              setTypeFilter("");
              setSearch("");
            }}
            className="text-xs font-medium text-brand hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        {columns.map((col) => {
          const colItems = filtered.filter((r) => r.state === col.state);
          return (
            <div
              key={col.state}
              className="rounded-xl border flex flex-col min-h-[500px]"
              style={{
                background: "var(--surface-sunken, #f8fafc)",
                borderColor: "var(--border-light)",
              }}
            >
              {/* Column Header */}
              <div
                className="p-3 border-b flex items-center justify-between rounded-t-xl"
                style={{
                  borderColor: "var(--border-light)",
                  borderTop: `3px solid ${col.color}`,
                  background: "var(--surface)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: col.color }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: col.bg, color: col.color }}
                >
                  {colItems.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                {colItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs font-medium" style={{ color: "var(--ink-faint)" }}>
                      No operations
                    </p>
                  </div>
                ) : (
                  colItems.map((r) => {
                    const badge = typeBadge[r.type];
                    return (
                      <Link
                        key={r.id}
                        href={`/operations/${opPath(r.type)}/${r.id}`}
                        className="card p-3 block transition-all hover:shadow-md hover:-translate-y-0.5 group border"
                        style={{
                          background: "var(--surface)",
                          borderColor: "var(--border-light)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <span className="font-mono text-xs font-semibold text-brand group-hover:underline">
                            {r.name}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {r.partner?.name && (
                          <div
                            className="text-xs truncate mb-1.5 font-medium"
                            style={{ color: "var(--ink)" }}
                            title={r.partner.name}
                          >
                            👤 {r.partner.name}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t mt-2 text-[11px]" style={{ borderColor: "var(--border-light)" }}>
                          <span style={{ color: "var(--ink-muted)" }}>
                            WH: {r.warehouse?.code ?? "—"}
                          </span>
                          <span className="font-mono" style={{ color: "var(--ink-faint)" }}>
                            {(r.scheduledAt || r.validatedAt)
                              ? new Date(r.scheduledAt || r.validatedAt!).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Active"}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <KanbanContent />
    </Suspense>
  );
}
