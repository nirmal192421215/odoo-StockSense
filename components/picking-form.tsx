"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Field, StatusPill, inputClass, selectClass } from "@/components/ui";
import {
  api,
  opPath,
  type Location,
  type Master,
  type PickingRow,
  type PickingType,
  type ProductRow,
} from "@/lib/client";

type LineDraft = {
  productId: string;
  qty: string;
  sourceLocationId: string;
  destLocationId: string;
};

function defaultsFor(type: PickingType, master: Master, warehouseId: string) {
  const supplier      = master.locations.find((l) => l.type === "supplier");
  const customer      = master.locations.find((l) => l.type === "customer");
  const loss          = master.locations.find((l) => l.type === "inventory_loss");
  const physical      = master.locations.filter(
    (l) => (l.type === "internal" || l.type === "production") && (!warehouseId || l.warehouseId === warehouseId),
  );
  const fallbackPhysical = master.locations.filter(
    (l) => l.type === "internal" || l.type === "production",
  );
  const stock = physical[0] ?? fallbackPhysical[0];
  const other = physical[1] ?? fallbackPhysical[1] ?? stock;
  if (type === "receipt")     return { sourceLocationId: supplier?.id ?? "", destLocationId: stock?.id ?? "" };
  if (type === "delivery")    return { sourceLocationId: stock?.id ?? "",    destLocationId: customer?.id ?? "" };
  if (type === "internal")    return { sourceLocationId: stock?.id ?? "",    destLocationId: other?.id ?? "" };
  return { sourceLocationId: loss?.id ?? "", destLocationId: stock?.id ?? "" };
}

const typeLabel: Record<PickingType, string> = {
  receipt: "Receipt",
  delivery: "Delivery",
  internal: "Internal Transfer",
  adjustment: "Inventory Adjustment",
};

export function PickingForm({
  type,
  pickingId,
}: {
  type: PickingType;
  pickingId?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isManager = session?.user?.role === "inventory_manager";

  const [master, setMaster]       = useState<Master | null>(null);
  const [products, setProducts]   = useState<ProductRow[]>([]);
  const [picking, setPicking]     = useState<PickingRow | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [partnerId, setPartnerId]     = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destLocationId, setDestLocationId]     = useState("");
  const [reason, setReason]       = useState("");
  const [notes, setNotes]         = useState("");
  const [lines, setLines]         = useState<LineDraft[]>([
    { productId: "", qty: "1", sourceLocationId: "", destLocationId: "" },
  ]);
  const [error, setError]         = useState("");
  const [pending, setPending]     = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Master>("/api/master"),
      api<{ products: ProductRow[] }>("/api/products"),
      pickingId
        ? api<{ picking: PickingRow }>(`/api/pickings/${pickingId}`)
        : Promise.resolve(null),
    ]).then(([m, p, existing]) => {
      setMaster(m);
      setProducts(p.products);
      const wh = existing?.picking.warehouseId ?? m.warehouses[0]?.id ?? "";
      setWarehouseId(wh);
      if (existing) {
        const doc = existing.picking;
        setPicking(doc);
        setPartnerId(doc.partnerId ?? "");
        setSourceLocationId(doc.sourceLocationId);
        setDestLocationId(doc.destLocationId);
        setReason(doc.reason ?? "");
        setNotes(doc.notes ?? "");
        setLines(
          (doc.lines ?? []).map((l) => ({
            productId: l.productId,
            qty: String(l.qty),
            sourceLocationId: l.sourceLocationId,
            destLocationId: l.destLocationId,
          })),
        );
      } else {
        const d = defaultsFor(type, m, wh);
        setSourceLocationId(d.sourceLocationId);
        setDestLocationId(d.destLocationId);
        setLines([
          {
            productId: p.products[0]?.id ?? "",
            qty: "1",
            sourceLocationId: d.sourceLocationId,
            destLocationId: d.destLocationId,
          },
        ]);
      }
    });
  }, [pickingId, type]);

  const draft    = !picking || picking.state === "draft";
  const partners = useMemo(() => {
    if (!master) return [];
    if (type === "receipt")  return master.partners.filter((p) => p.type === "vendor"   || p.type === "both");
    if (type === "delivery") return master.partners.filter((p) => p.type === "customer" || p.type === "both");
    return master.partners;
  }, [master, type]);

  const locOptions = (pred: (l: Location) => boolean) =>
    master?.locations.filter(pred) ?? [];

  function syncHeaderLocs(src: string, dest: string) {
    setSourceLocationId(src);
    setDestLocationId(dest);
    setLines((prev) => prev.map((l) => ({ ...l, sourceLocationId: src, destLocationId: dest })));
  }

  async function saveDraft(): Promise<string | null> {
    const payload = {
      type,
      warehouseId,
      partnerId: partnerId || null,
      sourceLocationId,
      destLocationId,
      reason: reason || null,
      notes:  notes  || null,
      lines: lines.map((l) => ({
        productId: l.productId,
        qty: Number(l.qty),
        sourceLocationId: l.sourceLocationId || sourceLocationId,
        destLocationId:   l.destLocationId   || destLocationId,
      })),
    };
    if (pickingId) {
      const res = await api<{ picking: PickingRow }>(`/api/pickings/${pickingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setPicking(res.picking);
      return res.picking.id;
    }
    const res = await api<{ picking: PickingRow }>("/api/pickings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setPicking(res.picking);
    router.replace(`/operations/${opPath(type)}/${res.picking.id}`);
    return res.picking.id;
  }

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
      setActionPending(null);
    }
  }

  async function refresh(id: string) {
    const res = await api<{ picking: PickingRow }>(`/api/pickings/${id}`);
    setPicking(res.picking);
  }

  async function postAction(id: string, action: string) {
    setActionPending(action);
    const res = await api<{ picking?: PickingRow }>(`/api/pickings/${id}/${action}`, { method: "POST" });
    if (res.picking) setPicking(res.picking);
    else await refresh(id);
  }

  if (!master) {
    return (
      <div className="flex items-center gap-3 p-6" style={{ color: "var(--ink-muted)" }}>
        <svg className="loading-pulse" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
          <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
        </svg>
        Loading document…
      </div>
    );
  }

  const canCancel =
    picking &&
    picking.state !== "done" &&
    picking.state !== "canceled" &&
    (picking.state === "draft" || isManager);

  const stateColor: Record<string, string> = {
    draft:    "var(--status-draft)",
    waiting:  "var(--status-waiting)",
    ready:    "var(--status-ready)",
    done:     "var(--status-done)",
    canceled: "var(--status-canceled)",
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ─── Sticky Action Bar ─────────────────────────────────────────────── */}
      <div className="action-bar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {picking?.name ?? `New ${typeLabel[type]}`}
            </span>
            {picking && <StatusPill state={picking.state} />}
          </div>
          {picking?.state && (
            <div style={{ fontSize: "0.75rem", color: stateColor[picking.state] ?? "var(--ink-muted)", marginTop: 3 }}>
              {picking.state === "ready" && type === "delivery"
                ? `${picking.picked ? "✓ Picked" : "○ Not picked"} · ${picking.packed ? "✓ Packed" : "○ Not packed"}`
                : null}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {draft && (
            <Button
              variant="secondary"
              disabled={pending}
              loading={actionPending === null && pending}
              onClick={() => run(async () => { await saveDraft(); })}
            >
              Save draft
            </Button>
          )}

          {(!picking || picking.state === "draft" || picking.state === "waiting") && (
            <Button
              disabled={pending}
              loading={actionPending === "confirm"}
              onClick={() =>
                run(async () => {
                  setActionPending("confirm");
                  const id = picking?.id ?? (await saveDraft());
                  if (!id) return;
                  await postAction(id, "confirm");
                })
              }
            >
              Confirm
            </Button>
          )}

          {type === "delivery" && picking?.state === "ready" && !picking.picked && (
            <Button
              disabled={pending}
              loading={actionPending === "pick"}
              onClick={() => run(() => postAction(picking.id, "pick"))}
            >
              ✓ Mark picked
            </Button>
          )}

          {type === "delivery" && picking?.state === "ready" && picking.picked && !picking.packed && (
            <Button
              disabled={pending}
              loading={actionPending === "pack"}
              onClick={() => run(() => postAction(picking.id, "pack"))}
            >
              📦 Mark packed
            </Button>
          )}

          {picking?.state === "ready" && (
            <Button
              disabled={pending}
              loading={actionPending === "validate"}
              onClick={() =>
                run(async () => {
                  setActionPending("validate");
                  if (type === "adjustment") {
                    await api(`/api/pickings/${picking.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ reason, notes }),
                    });
                  }
                  await postAction(picking.id, "validate");
                })
              }
              style={{ background: "var(--status-done)", boxShadow: "0 1px 3px rgba(22,163,74,0.3)" }}
            >
              ✓ Validate
            </Button>
          )}

          {canCancel && (
            <Button
              variant="danger"
              disabled={pending}
              loading={actionPending === "cancel"}
              onClick={() => run(() => postAction(picking!.id, "cancel"))}
            >
              Cancel
            </Button>
          )}

          {type === "delivery" && picking && (
            <Link
              href={`/operations/deliveries/${picking.id}/print`}
              className="btn btn-ghost btn-sm"
              style={{ textDecoration: "none" }}
            >
              🖨️ Print
            </Link>
          )}
        </div>
      </div>

      {/* ─── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="alert-error animate-fade-in">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ─── Header Fields ────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          padding: 20,
        }}
      >
        <Field label="Warehouse">
          <select
            className={selectClass()}
            disabled={!draft}
            value={warehouseId}
            onChange={(e) => {
              const wh = e.target.value;
              setWarehouseId(wh);
              const d = defaultsFor(type, master, wh);
              syncHeaderLocs(d.sourceLocationId, d.destLocationId);
            }}
          >
            {master.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </Field>

        {(type === "receipt" || type === "delivery") && (
          <Field label={type === "receipt" ? "Vendor" : "Customer"}>
            <select
              className={selectClass()}
              disabled={!draft}
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value="">Select partner…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Source location">
          <select
            className={selectClass()}
            disabled={!draft || type === "adjustment"}
            value={sourceLocationId}
            onChange={(e) => syncHeaderLocs(e.target.value, destLocationId)}
          >
            {locOptions(() => true).map((l) => (
              <option key={l.id} value={l.id}>{l.completeName}</option>
            ))}
          </select>
        </Field>

        <Field label={type === "adjustment" ? "Counted location" : "Destination"}>
          <select
            className={selectClass()}
            disabled={!draft}
            value={destLocationId}
            onChange={(e) => syncHeaderLocs(sourceLocationId, e.target.value)}
          >
            {locOptions(() => true).map((l) => (
              <option key={l.id} value={l.id}>{l.completeName}</option>
            ))}
          </select>
        </Field>

        {type === "adjustment" ? (
          <Field label="Reason" required hint="Required before validate">
            <input
              className={inputClass()}
              disabled={!draft && picking?.state !== "ready"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged goods, cycle count…"
            />
          </Field>
        ) : (
          <Field label="Notes">
            <input
              className={inputClass()}
              disabled={!draft}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes…"
            />
          </Field>
        )}
      </div>

      {/* ─── Lines Table ──────────────────────────────────────────────────── */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
            Lines
            {type === "adjustment" && (
              <span style={{ fontWeight: 400, color: "var(--ink-muted)", marginLeft: 6, fontSize: "0.8rem" }}>
                — enter the counted on-hand qty at the destination
              </span>
            )}
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
            {lines.length} line{lines.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ minWidth: 100 }}>Qty</th>
                <th>From</th>
                <th>To</th>
                {draft && <th style={{ width: 60 }} />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  <td>
                    <select
                      className={selectClass()}
                      style={{ minWidth: 180 }}
                      disabled={!draft}
                      value={line.productId}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i] = { ...line, productId: e.target.value };
                        setLines(next);
                      }}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className={inputClass()}
                      style={{ minWidth: 90 }}
                      disabled={!draft}
                      type="number"
                      min="0"
                      step="0.0001"
                      value={line.qty}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i] = { ...line, qty: e.target.value };
                        setLines(next);
                      }}
                    />
                  </td>
                  <td>
                    <select
                      className={selectClass()}
                      style={{ minWidth: 160 }}
                      disabled={!draft || type !== "internal"}
                      value={line.sourceLocationId}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i] = { ...line, sourceLocationId: e.target.value };
                        setLines(next);
                      }}
                    >
                      {locOptions(() => true).map((l) => (
                        <option key={l.id} value={l.id}>{l.completeName}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className={selectClass()}
                      style={{ minWidth: 160 }}
                      disabled={!draft || type !== "internal"}
                      value={line.destLocationId}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i] = { ...line, destLocationId: e.target.value };
                        setLines(next);
                      }}
                    >
                      {locOptions(() => true).map((l) => (
                        <option key={l.id} value={l.id}>{l.completeName}</option>
                      ))}
                    </select>
                  </td>
                  {draft && (
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => setLines(lines.filter((_, j) => j !== i))}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--ink-muted)",
                          fontSize: "1.1rem",
                          padding: "4px",
                          borderRadius: 4,
                          lineHeight: 1,
                          transition: "color 0.15s",
                        }}
                        title="Remove line"
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {draft && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-light)" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setLines([
                  ...lines,
                  {
                    productId: products[0]?.id ?? "",
                    qty: "1",
                    sourceLocationId,
                    destLocationId,
                  },
                ])
              }
            >
              + Add line
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
