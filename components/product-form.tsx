"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertBadge, Button, Card, Field, PageHeader, Spinner, inputClass, selectClass } from "@/components/ui";
import { api, type Master, type ProductRow } from "@/lib/client";

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isManager = session?.user?.role === "inventory_manager";
  const [master, setMaster] = useState<Master | null>(null);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<Master>("/api/master").then(setMaster);
    if (productId) {
      api<{ product: ProductRow }>(`/api/products/${productId}`).then((d) => setProduct(d.product));
    }
  }, [productId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isManager) return;
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get("name")),
      sku: String(form.get("sku")),
      categoryId: String(form.get("categoryId")),
      uomId: String(form.get("uomId")),
      minQty: Number(form.get("minQty") || 0),
      ...(productId
        ? {}
        : {
            initialQty: Number(form.get("initialQty") || 0),
            initialLocationId: String(form.get("initialLocationId") || "") || undefined,
          }),
    };
    try {
      if (productId) {
        const res = await api<{ product: ProductRow }>(`/api/products/${productId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setProduct(res.product);
      } else {
        const res = await api<{ product: ProductRow }>("/api/products", {
          method: "POST",
          body: JSON.stringify(body),
        });
        router.replace(`/products/${res.product.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!productId || !isManager) return;
    if (!confirm("Are you sure you want to delete this product? All unlinked history may be preserved.")) return;
    try {
      await api(`/api/products/${productId}`, { method: "DELETE" });
      router.push("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (!master || (productId && !product)) {
    return <Spinner />;
  }

  const physical = master.locations.filter((l) => l.type === "internal" || l.type === "production");

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-4xl animate-fade-in">
      <PageHeader
        title={product ? product.name : "Create New Product"}
        subtitle={
          product
            ? `SKU: ${product.sku} • Managed via double-entry stock ledger`
            : "Define product specifications, categories, and initial inventory"
        }
        actions={
          <div className="flex items-center gap-2">
            {product && <AlertBadge kind={product.alert?.kind ?? null} />}
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/products")}
            >
              ← Back to Products
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Main Details Card */}
      <Card className="space-y-5">
        <h2 className="text-base font-semibold border-b pb-2" style={{ borderColor: "var(--border-light)", color: "var(--ink)" }}>
          Product Information
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Product Name" required>
            <input
              className={inputClass()}
              name="name"
              defaultValue={product?.name}
              placeholder="e.g. Industrial Steel Plate"
              required
              disabled={!isManager}
            />
          </Field>

          <Field label="Stock Keeping Unit (SKU)" required>
            <input
              className={inputClass("font-mono font-medium")}
              name="sku"
              defaultValue={product?.sku}
              placeholder="e.g. STL-PLT-001"
              required
              disabled={!isManager}
            />
          </Field>

          <Field label="Product Category" required>
            <select
              className={selectClass()}
              name="categoryId"
              defaultValue={product?.categoryId}
              disabled={!isManager}
            >
              {master.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Unit of Measure (UoM)" required>
            <select
              className={selectClass()}
              name="uomId"
              defaultValue={product?.uomId}
              disabled={!isManager}
            >
              {master.uoms.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {/* Inventory & Reorder Rules */}
      <Card className="space-y-5">
        <h2 className="text-base font-semibold border-b pb-2" style={{ borderColor: "var(--border-light)", color: "var(--ink)" }}>
          Inventory Policy & Reordering
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Reordering Minimum Quantity"
            hint="System triggers a Low-Stock alert when total on-hand quantity drops below this threshold."
          >
            <div className="relative">
              <input
                className={inputClass("pr-12 font-mono")}
                name="minQty"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={product?.minQty ?? 0}
                disabled={!isManager}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "var(--ink-faint)" }}>
                {product?.uom?.symbol ?? "units"}
              </span>
            </div>
          </Field>

          {!productId && (
            <>
              <Field
                label="Opening Balance Quantity"
                hint="Initial balance to be booked into stock ledger upon creation."
              >
                <input
                  className={inputClass("font-mono")}
                  name="initialQty"
                  type="number"
                  min="0"
                  step="0.0001"
                  defaultValue="0"
                />
              </Field>

              <Field
                label="Initial Storage Location"
                hint="The warehouse internal location where initial quantity will be held."
              >
                <select className={selectClass()} name="initialLocationId">
                  <option value="">— Select Warehouse Location —</option>
                  {physical.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.completeName}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
      </Card>

      {/* Location Breakdown for existing product */}
      {product?.quants && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border-light)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
              Physical Stock Breakdown
            </h2>
            <div className="text-xs font-semibold px-2.5 py-1 rounded" style={{ background: "rgba(113, 75, 103, 0.08)", color: "var(--brand)" }}>
              Total On Hand: {product.onHand} {product.uom?.symbol}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-light)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface-sunken)", color: "var(--ink-muted)" }} className="text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 text-left">Location Hierarchy</th>
                  <th className="px-4 py-2.5 text-right">Quantity on Hand</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                {product.quants.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-xs" style={{ color: "var(--ink-faint)" }}>
                      No inventory currently recorded in physical locations.
                    </td>
                  </tr>
                ) : (
                  product.quants.map((q) => (
                    <tr key={q.location.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium" style={{ color: "var(--ink)" }}>
                        📍 {q.location.completeName}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: "var(--brand)" }}>
                        {q.quantity} {product.uom?.symbol}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
            Note: On-hand values are calculated immutably from stock moves and quants. They cannot be directly overwritten.
          </p>
        </Card>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border-light)" }}>
        {isManager ? (
          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>
              {productId ? "Save Changes" : "Create Product"}
            </Button>
            {productId && (
              <Button type="button" variant="danger" onClick={onDelete}>
                Delete Product
              </Button>
            )}
          </div>
        ) : (
          <div className="text-xs p-3 rounded bg-amber-50 text-amber-800 border border-amber-200">
            ℹ️ View-only mode. Inventory Manager role is required to modify or create products.
          </div>
        )}
      </div>
    </form>
  );
}
