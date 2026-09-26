"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Spinner, StatusPill } from "@/components/ui";
import { api } from "@/lib/client";

type LocationItem = {
  productId: string;
  sku: string;
  name: string;
  category: string;
  uom: string;
  quantity: number;
};

type WarehouseLocation = {
  id: string;
  name: string;
  completeName: string;
  type: string;
  gridPosition: { row: number; col: number };
  totalUnits: number;
  utilizationPercent: number;
  status: "optimal" | "warning" | "empty" | "full";
  items: LocationItem[];
};

type WarehouseMapData = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  totalStockUnits: number;
  totalSkus: number;
  locationCount: number;
  locations: WarehouseLocation[];
};

export function WarehouseMapComponent() {
  const [data, setData] = useState<WarehouseMapData[] | null>(null);
  const [activeWhId, setActiveWhId] = useState<string>("");
  const [selectedLoc, setSelectedLoc] = useState<WarehouseLocation | null>(null);
  const [viewMode, setViewMode] = useState<"capacity" | "occupancy">("capacity");

  useEffect(() => {
    api<{ warehouses: WarehouseMapData[] }>("/api/warehouse-map").then((res) => {
      setData(res.warehouses);
      if (res.warehouses.length > 0 && !activeWhId) {
        setActiveWhId(res.warehouses[0].id);
      }
    });
  }, [activeWhId]);

  if (!data) {
    return (
      <div className="p-6">
        <PageHeader title="Warehouse Digital Twin" subtitle="Loading live spatial topology..." />
        <Spinner />
      </div>
    );
  }

  const currentWh = data.find((w) => w.id === activeWhId) || data[0];

  return (
    <div className="space-y-6 animate-fade-in" style={{ maxWidth: 1400 }}>
      <PageHeader
        title="Warehouse Digital Twin & Visualizer"
        subtitle="Interactive spatial view of bays, racks, and real-time inventory density"
        actions={
          <div className="flex items-center gap-3">
            {/* Warehouse Selector */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg border bg-surface" style={{ borderColor: "var(--border-light)" }}>
              {data.map((wh) => (
                <button
                  key={wh.id}
                  onClick={() => {
                    setActiveWhId(wh.id);
                    setSelectedLoc(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeWhId === wh.id
                      ? "bg-[#714b67] text-white shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  🏢 {wh.name} ({wh.code})
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg border bg-surface text-xs" style={{ borderColor: "var(--border-light)" }}>
              <button
                onClick={() => setViewMode("capacity")}
                className={`px-2.5 py-1 rounded font-medium ${
                  viewMode === "capacity" ? "bg-black/10 dark:bg-white/10 font-bold" : "opacity-60"
                }`}
              >
                📊 Heatmap
              </button>
              <button
                onClick={() => setViewMode("occupancy")}
                className={`px-2.5 py-1 rounded font-medium ${
                  viewMode === "occupancy" ? "bg-black/10 dark:bg-white/10 font-bold" : "opacity-60"
                }`}
              >
                📦 Items List
              </button>
            </div>
          </div>
        }
      />

      {/* Warehouse Overview KPIs */}
      {currentWh && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider font-semibold text-ink-muted mb-1">
              Active Warehouse
            </div>
            <div className="text-lg font-bold text-ink">
              {currentWh.name} <span className="text-xs font-mono font-normal opacity-70">[{currentWh.code}]</span>
            </div>
            <div className="text-xs text-ink-muted truncate mt-0.5">{currentWh.address || "Main Logistics Hub"}</div>
          </div>

          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider font-semibold text-ink-muted mb-1">
              Total Units Stored
            </div>
            <div className="text-2xl font-black font-mono text-brand">
              {currentWh.totalStockUnits.toLocaleString()}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">Physical items on hand</div>
          </div>

          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider font-semibold text-ink-muted mb-1">
              Catalog Breadth
            </div>
            <div className="text-2xl font-black font-mono text-ink">
              {currentWh.totalSkus} SKUs
            </div>
            <div className="text-xs text-ink-muted mt-0.5">Across {currentWh.locationCount} monitored bays</div>
          </div>

          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider font-semibold text-ink-muted mb-1">
              Avg Utilization
            </div>
            {(() => {
              const avgUtil = currentWh.locations.length > 0
                ? Math.round(currentWh.locations.reduce((acc, l) => acc + l.utilizationPercent, 0) / currentWh.locations.length)
                : 0;
              return (
                <>
                  <div className="text-2xl font-black font-mono" style={{ color: avgUtil > 80 ? "#dc2626" : avgUtil > 50 ? "#d97706" : "#16a34a" }}>
                    {avgUtil}%
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">Storage density</div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Main Floor Plan & Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Graphical Interactive Floorplan */}
        <div className="lg:col-span-2 card p-5 flex flex-col justify-between" style={{ minHeight: 460 }}>
          <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Physical Floor Plan Layout</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">
                Live Sensor Sync
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> Empty
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Optimal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High Density
              </span>
            </div>
          </div>

          {/* Docks & Racks Grid */}
          <div className="space-y-4">
            {/* Inbound Staging Strip */}
            <div
              className="p-3 rounded-lg border-2 border-dashed flex items-center justify-between text-xs"
              style={{
                borderColor: "rgba(22, 163, 74, 0.4)",
                background: "rgba(22, 163, 74, 0.04)",
              }}
            >
              <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                <span>📥</span> Inbound Receiving Dock / Quarantine Bay
              </div>
              <Link href="/operations/receipts/new" className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium">
                + Receive Cargo →
              </Link>
            </div>

            {/* Bays Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 my-3">
              {currentWh?.locations.map((loc) => {
                const isSelected = selectedLoc?.id === loc.id;
                const statusColor =
                  loc.status === "empty"
                    ? "#94a3b8"
                    : loc.status === "warning"
                    ? "#f59e0b"
                    : loc.status === "full"
                    ? "#ef4444"
                    : "#10b981";

                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLoc(loc)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 transform hover:-translate-y-1 hover:shadow-md ${
                      isSelected
                        ? "ring-2 ring-[#714b67] shadow-md border-transparent"
                        : "hover:border-ink-muted"
                    }`}
                    style={{
                      background: isSelected ? "var(--surface-raised, #ffffff)" : "var(--surface)",
                      borderColor: isSelected ? "var(--brand)" : "var(--border-light)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-xs font-bold text-ink uppercase tracking-wide">
                          {loc.name}
                        </div>
                        <div className="text-[11px] font-mono text-ink-muted truncate max-w-[130px]">
                          {loc.completeName}
                        </div>
                      </div>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: statusColor }}
                        title={`Status: ${loc.status}`}
                      />
                    </div>

                    {/* Progress Bar of capacity */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden my-2.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(5, loc.utilizationPercent)}%`,
                          backgroundColor: statusColor,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-mono font-bold text-ink">
                        {loc.totalUnits.toLocaleString()} units
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        {loc.items.length} SKU{loc.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Outbound Staging Strip */}
            <div
              className="p-3 rounded-lg border-2 border-dashed flex items-center justify-between text-xs"
              style={{
                borderColor: "rgba(37, 99, 235, 0.4)",
                background: "rgba(37, 99, 235, 0.04)",
              }}
            >
              <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-400">
                <span>📤</span> Outbound Dispatch Dock / Packing Bay
              </div>
              <Link href="/operations/deliveries/new" className="text-blue-700 dark:text-blue-400 hover:underline font-medium">
                + Prepare Delivery →
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Selected Location Detail Card */}
        <div className="card p-5 flex flex-col justify-between" style={{ minHeight: 460 }}>
          {selectedLoc ? (
            <div className="space-y-4">
              <div className="border-b pb-3" style={{ borderColor: "var(--border-light)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase font-bold text-brand">Selected Bay</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                    {selectedLoc.utilizationPercent}% capacity
                  </span>
                </div>
                <h3 className="text-lg font-bold text-ink">{selectedLoc.name}</h3>
                <p className="text-xs font-mono text-ink-muted">{selectedLoc.completeName}</p>
              </div>

              {/* Items Stored */}
              <div>
                <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Stored Materials ({selectedLoc.items.length})
                </div>

                {selectedLoc.items.length === 0 ? (
                  <div className="p-6 text-center rounded-lg border border-dashed text-xs text-ink-muted" style={{ borderColor: "var(--border-light)" }}>
                    This rack is currently empty. Ready for incoming transfers.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedLoc.items.map((item) => (
                      <div
                        key={item.productId}
                        className="p-2.5 rounded-lg border flex items-center justify-between text-xs"
                        style={{ borderColor: "var(--border-light)", background: "var(--surface-raised, rgba(0,0,0,0.02))" }}
                      >
                        <div>
                          <div className="font-semibold text-ink">{item.name}</div>
                          <div className="font-mono text-[11px] text-ink-muted">
                            SKU: {item.sku} • {item.category}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-brand text-sm">
                            {item.quantity.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-ink-muted uppercase">{item.uom}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions for this Location */}
              <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--border-light)" }}>
                <Link
                  href={`/operations/transfers/new?sourceLocationId=${selectedLoc.id}`}
                  className="btn btn-primary btn-sm w-full text-center block"
                >
                  🔄 Transfer Stock From Here
                </Link>
                <Link
                  href={`/operations/adjustments/new?locationId=${selectedLoc.id}`}
                  className="btn btn-secondary btn-sm w-full text-center block"
                >
                  ⚖️ Count & Audit Bay Stock
                </Link>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-muted space-y-2">
              <span className="text-4xl">🗺️</span>
              <div className="font-semibold text-sm text-ink">Select a Bay from the Floor Plan</div>
              <div className="text-xs max-w-xs">
                Click any rack slot on the left to inspect its live stock breakdown, capacity gauge, and trigger instant transfers.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
