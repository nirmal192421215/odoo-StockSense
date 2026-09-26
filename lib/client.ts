export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export type PickingType = "receipt" | "delivery" | "internal" | "adjustment";
export type PickingState = "draft" | "waiting" | "ready" | "done" | "canceled";

export type Location = {
  id: string;
  name: string;
  completeName: string;
  type: "internal" | "supplier" | "customer" | "inventory_loss" | "production";
  warehouseId: string | null;
};

export type Master = {
  categories: { id: string; name: string }[];
  uoms: { id: string; name: string; symbol: string }[];
  partners: { id: string; name: string; type: "vendor" | "customer" | "both" }[];
  warehouses: { id: string; name: string; code: string }[];
  locations: Location[];
};

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  uomId: string;
  minQty: number;
  onHand: number;
  category?: { name: string };
  uom?: { name: string; symbol: string };
  alert: { kind: "low_stock" | "out_of_stock"; onHand: number; minQty: number } | null;
  quants?: { quantity: number; location: Location }[];
};

export type PickingLine = {
  id?: string;
  productId: string;
  qty: number;
  sourceLocationId: string;
  destLocationId: string;
  product?: { id: string; name: string; sku: string; uom?: { symbol: string } };
  sourceLocation?: Location;
  destLocation?: Location;
};

export type PickingRow = {
  id: string;
  name: string;
  type: PickingType;
  state: PickingState;
  warehouseId: string;
  partnerId: string | null;
  sourceLocationId: string;
  destLocationId: string;
  picked: boolean;
  packed: boolean;
  reason: string | null;
  notes: string | null;
  scheduledAt: string | null;
  validatedAt: string | null;
  partner?: { name: string } | null;
  warehouse?: { name: string; code: string };
  sourceLocation?: Location;
  destLocation?: Location;
  createdBy?: { name: string };
  validatedBy?: { name: string } | null;
  lines?: PickingLine[];
};

export const opMeta: Record<
  string,
  { type: PickingType; title: string; singular: string; create: string }
> = {
  receipts: { type: "receipt", title: "Receipts", singular: "Receipt", create: "Create receipt" },
  deliveries: { type: "delivery", title: "Deliveries", singular: "Delivery", create: "Create delivery" },
  transfers: { type: "internal", title: "Internal transfers", singular: "Transfer", create: "Create transfer" },
  adjustments: { type: "adjustment", title: "Adjustments", singular: "Adjustment", create: "Create adjustment" },
};

export function opPath(type: PickingType) {
  if (type === "receipt") return "receipts";
  if (type === "delivery") return "deliveries";
  if (type === "internal") return "transfers";
  return "adjustments";
}
