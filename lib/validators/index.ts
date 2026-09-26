import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().min(1),
  uomId: z.string().min(1),
  minQty: z.coerce.number().min(0).default(0),
  initialQty: z.coerce.number().min(0).optional(),
  initialLocationId: z.string().optional(),
});

export const lineSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().positive("Quantity must be greater than zero."),
  sourceLocationId: z.string().min(1),
  destLocationId: z.string().min(1),
});

export const pickingSchema = z.object({
  type: z.enum(["receipt", "delivery", "internal", "adjustment"]),
  warehouseId: z.string().min(1),
  partnerId: z.string().optional().nullable(),
  sourceLocationId: z.string().min(1),
  destLocationId: z.string().min(1),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1, "Cannot validate an empty document."),
});

export const warehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

export const locationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["internal", "supplier", "customer", "inventory_loss", "production"]),
  warehouseId: z.string().optional().nullable(),
});
