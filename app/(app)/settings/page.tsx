"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button, Card, Field, PageHeader, Spinner, inputClass, selectClass } from "@/components/ui";
import { api, type Master } from "@/lib/client";

const locationTypeBadge: Record<string, { label: string; bg: string; color: string }> = {
  internal: { label: "Internal Physical", bg: "rgba(113, 75, 103, 0.1)", color: "var(--brand)" },
  production: { label: "Production Rack", bg: "rgba(124, 58, 237, 0.1)", color: "#7c3aed" },
  supplier: { label: "Supplier (Virtual)", bg: "rgba(22, 163, 74, 0.1)", color: "#16a34a" },
  customer: { label: "Customer (Virtual)", bg: "rgba(37, 99, 235, 0.1)", color: "#2563eb" },
  inventory_loss: { label: "Inventory Loss (Virtual)", bg: "rgba(217, 119, 6, 0.1)", color: "#d97706" },
};

const partnerTypeBadge: Record<string, { label: string; bg: string; color: string }> = {
  vendor: { label: "Vendor", bg: "rgba(22, 163, 74, 0.1)", color: "#16a34a" },
  customer: { label: "Customer", bg: "rgba(37, 99, 235, 0.1)", color: "#2563eb" },
  both: { label: "Vendor & Customer", bg: "rgba(113, 75, 103, 0.1)", color: "var(--brand)" },
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "inventory_manager";
  const [master, setMaster] = useState<Master | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"warehouses" | "locations" | "partners" | "categories">("warehouses");

  function reload() {
    api<Master>("/api/master").then(setMaster);
  }

  useEffect(() => {
    reload();
  }, []);

  async function create(entity: string, data: Record<string, string>) {
    setError("");
    setSuccess("");
    setPending(true);
    try {
      await api("/api/master", { method: "POST", body: JSON.stringify({ entity, data }) });
      setSuccess(`Added new ${entity} successfully.`);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  if (!master) {
    return (
      <div className="space-y-6">
        <PageHeader title="Warehouse Settings" subtitle="Master configurations and reference data" />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <PageHeader
        title="Warehouse Settings"
        subtitle={
          isManager
            ? "Manage organizational entities, physical/virtual locations, partners, and units"
            : "View-only mode. Inventory Manager permissions required to modify master configuration."
        }
        actions={
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: isManager ? "rgba(22, 163, 74, 0.1)" : "rgba(217, 119, 6, 0.1)",
              color: isManager ? "#16a34a" : "#d97706",
            }}
          >
            {isManager ? "Manager Access: Full Configuration" : "Staff Access: Read-Only"}
          </span>
        }
      />

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 font-medium">
          ✓ {success}
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--border-light)" }}>
        {[
          { key: "warehouses", label: "Warehouses", count: master.warehouses.length, icon: "🏭" },
          { key: "locations", label: "Locations", count: master.locations.length, icon: "📍" },
          { key: "partners", label: "Partners", count: master.partners.length, icon: "👥" },
          { key: "categories", label: "Categories & UoM", count: master.categories.length + master.uoms.length, icon: "🏷️" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className="px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2"
              style={{
                background: isActive ? "var(--brand)" : "transparent",
                color: isActive ? "#ffffff" : "var(--ink-muted)",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className="text-[10px] px-1.5 py-0.2 rounded-full"
                style={{
                  background: isActive ? "rgba(255, 255, 255, 0.25)" : "var(--border-light)",
                  color: isActive ? "#ffffff" : "var(--ink-muted)",
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Warehouses */}
      {activeTab === "warehouses" && (
        <Card className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-light)" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                Warehouses
              </h2>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                Top-level operational facilities containing internal racks and bays.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-light)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface-sunken)", color: "var(--ink-muted)" }} className="text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 text-left">Code</th>
                  <th className="px-4 py-2.5 text-left">Facility Name</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                {master.warehouses.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-xs" style={{ color: "var(--brand)" }}>
                      {w.code}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>
                      {w.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isManager && (
            <form
              className="pt-4 border-t space-y-3"
              style={{ borderColor: "var(--border-light)" }}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                create("warehouse", { name: String(f.get("name")), code: String(f.get("code")) });
                e.currentTarget.reset();
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                Add New Warehouse
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className={inputClass("w-32 uppercase font-mono")}
                  name="code"
                  placeholder="CODE (e.g. WH2)"
                  required
                />
                <input
                  className={inputClass("flex-1 min-w-[200px]")}
                  name="name"
                  placeholder="Facility Name (e.g. West Coast Distribution)"
                  required
                />
                <Button type="submit" loading={pending}>
                  + Add Warehouse
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* TAB 2: Locations */}
      {activeTab === "locations" && (
        <Card className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-light)" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                Storage & Virtual Locations
              </h2>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                Double-entry stock model tracks physical shelves as well as virtual counterpart locations.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-light)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface-sunken)", color: "var(--ink-muted)" }} className="text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 text-left">Complete Location Path</th>
                  <th className="px-4 py-2.5 text-left">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                {master.locations.map((l) => {
                  const badge = locationTypeBadge[l.type] || {
                    label: l.type,
                    bg: "rgba(100, 116, 139, 0.1)",
                    color: "var(--ink-muted)",
                  };
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-xs" style={{ color: "var(--ink)" }}>
                        📍 {l.completeName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isManager && (
            <form
              className="pt-4 border-t space-y-3"
              style={{ borderColor: "var(--border-light)" }}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                create("location", {
                  name: String(f.get("name")),
                  type: String(f.get("type")),
                  warehouseId: String(f.get("warehouseId")),
                });
                e.currentTarget.reset();
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                Add New Location
              </h3>
              <div className="grid gap-3 sm:grid-cols-4">
                <input
                  className={inputClass("sm:col-span-2")}
                  name="name"
                  placeholder="Location Name (e.g. Zone B / Shelf 4)"
                  required
                />
                <select className={selectClass()} name="type" required>
                  <option value="internal">Internal Physical</option>
                  <option value="production">Production Rack</option>
                  <option value="supplier">Supplier (Virtual)</option>
                  <option value="customer">Customer (Virtual)</option>
                  <option value="inventory_loss">Inventory Loss (Virtual)</option>
                </select>
                <select className={selectClass()} name="warehouseId">
                  <option value="">No Warehouse (Virtual / Global)</option>
                  {master.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-2">
                <Button type="submit" loading={pending}>
                  + Add Location
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* TAB 3: Partners */}
      {activeTab === "partners" && (
        <Card className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-light)" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                Business Partners (Vendors & Customers)
              </h2>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                External entities involved in receipt supplier shipments and customer delivery pickings.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-light)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface-sunken)", color: "var(--ink-muted)" }} className="text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 text-left">Partner Name</th>
                  <th className="px-4 py-2.5 text-left">Relation Type</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                {master.partners.map((p) => {
                  const badge = partnerTypeBadge[p.type] || {
                    label: p.type,
                    bg: "rgba(100, 116, 139, 0.1)",
                    color: "var(--ink-muted)",
                  };
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-xs" style={{ color: "var(--ink)" }}>
                        🏢 {p.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isManager && (
            <form
              className="pt-4 border-t space-y-3"
              style={{ borderColor: "var(--border-light)" }}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                create("partner", { name: String(f.get("name")), type: String(f.get("type")) });
                e.currentTarget.reset();
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                Add New Partner
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className={inputClass("flex-1 min-w-[240px]")}
                  name="name"
                  placeholder="Partner Company Name (e.g. Apex Logistics)"
                  required
                />
                <select className={selectClass("w-44")} name="type">
                  <option value="vendor">Vendor</option>
                  <option value="customer">Customer</option>
                  <option value="both">Both (Vendor & Customer)</option>
                </select>
                <Button type="submit" loading={pending}>
                  + Add Partner
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* TAB 4: Categories & UoM */}
      {activeTab === "categories" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Categories */}
          <Card className="space-y-4">
            <h2 className="text-base font-semibold border-b pb-2" style={{ borderColor: "var(--border-light)", color: "var(--ink)" }}>
              Product Categories
            </h2>
            <div className="divide-y rounded-lg border" style={{ borderColor: "var(--border-light)" }}>
              {master.categories.map((c) => (
                <div key={c.id} className="p-3 text-xs font-medium flex items-center justify-between" style={{ color: "var(--ink)" }}>
                  <span>📦 {c.name}</span>
                  <span className="font-mono text-[10px]" style={{ color: "var(--ink-faint)" }}>
                    ID: {c.id.slice(0, 8)}
                  </span>
                </div>
              ))}
            </div>

            {isManager && (
              <form
                className="pt-3 border-t flex gap-2"
                style={{ borderColor: "var(--border-light)" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  create("category", { name: String(f.get("name")) });
                  e.currentTarget.reset();
                }}
              >
                <input
                  className={inputClass("flex-1 text-xs")}
                  name="name"
                  placeholder="New Category Name"
                  required
                />
                <Button type="submit" size="sm" loading={pending}>
                  Add
                </Button>
              </form>
            )}
          </Card>

          {/* Units of Measure */}
          <Card className="space-y-4">
            <h2 className="text-base font-semibold border-b pb-2" style={{ borderColor: "var(--border-light)", color: "var(--ink)" }}>
              Units of Measure (UoM)
            </h2>
            <div className="divide-y rounded-lg border" style={{ borderColor: "var(--border-light)" }}>
              {master.uoms.map((u) => (
                <div key={u.id} className="p-3 text-xs font-medium flex items-center justify-between" style={{ color: "var(--ink)" }}>
                  <span>⚖️ {u.name}</span>
                  <span className="font-mono font-bold text-brand px-2 py-0.5 rounded bg-slate-100">
                    {u.symbol}
                  </span>
                </div>
              ))}
            </div>

            {isManager && (
              <form
                className="pt-3 border-t flex gap-2"
                style={{ borderColor: "var(--border-light)" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  create("uom", { name: String(f.get("name")), symbol: String(f.get("symbol")) });
                  e.currentTarget.reset();
                }}
              >
                <input
                  className={inputClass("flex-1 text-xs")}
                  name="name"
                  placeholder="Unit Name (e.g. Liter)"
                  required
                />
                <input
                  className={inputClass("w-20 text-xs font-mono")}
                  name="symbol"
                  placeholder="L"
                  required
                />
                <Button type="submit" size="sm" loading={pending}>
                  Add
                </Button>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
