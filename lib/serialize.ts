import { num } from "@/lib/decimal";
import type {
  Alert,
  Location,
  Partner,
  Picking,
  PickingLine,
  Product,
  StockLedger,
  User,
  Warehouse,
} from "@prisma/client";

export function serializeProduct(
  product: Product & {
    category?: { name: string };
    uom?: { name: string; symbol: string };
    quants?: { quantity: unknown; location: Location }[];
    alert?: Alert | null;
    onHand?: number;
  },
) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    categoryId: product.categoryId,
    uomId: product.uomId,
    minQty: num(product.minQty),
    active: product.active,
    category: product.category,
    uom: product.uom,
    onHand: product.onHand ?? 0,
    alert: product.alert
      ? { kind: product.alert.kind, onHand: num(product.alert.onHand), minQty: num(product.alert.minQty) }
      : null,
    quants: product.quants?.map((q) => ({
      quantity: num(q.quantity as import("@prisma/client/runtime/library").Decimal | number | string),
      location: q.location,
    })),
  };
}

export function serializePicking(
  picking: Picking & {
    partner?: Partner | null;
    warehouse?: Warehouse;
    sourceLocation?: Location;
    destLocation?: Location;
    createdBy?: Pick<User, "id" | "name">;
    validatedBy?: Pick<User, "id" | "name"> | null;
    lines?: (PickingLine & {
      product: Product & { uom?: { symbol: string } };
      sourceLocation: Location;
      destLocation: Location;
    })[];
  },
) {
  return {
    ...picking,
    lines: picking.lines?.map((line) => ({
      ...line,
      qty: num(line.qty),
    })),
  };
}

export function serializeLedger(
  row: StockLedger & {
    product: Product;
    fromLocation: Location;
    toLocation: Location;
    user: Pick<User, "name">;
  },
) {
  return {
    id: row.id,
    occurredAt: row.occurredAt,
    product: { id: row.product.id, name: row.product.name, sku: row.product.sku },
    from: row.fromLocation,
    to: row.toLocation,
    qty: num(row.qty),
    pickingId: row.pickingId,
    pickingName: row.pickingName,
    type: row.type,
    user: row.user.name,
    reason: row.reason,
  };
}
