import { NextResponse } from "next/server";
import type { PickingState, PickingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { serializePicking } from "@/lib/serialize";
import { ON_HAND_TYPES } from "@/lib/stock/rules";

const include = {
  partner: true,
  warehouse: true,
  sourceLocation: true,
  destLocation: true,
  createdBy: { select: { id: true, name: true } },
  validatedBy: { select: { id: true, name: true } },
  lines: {
    include: {
      product: { include: { uom: true } },
      sourceLocation: true,
      destLocation: true,
    },
  },
} as const;

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as PickingType | null;
    const state = searchParams.get("state") as PickingState | null;
    const warehouseId = searchParams.get("warehouseId");
    const locationId = searchParams.get("locationId");
    const categoryId = searchParams.get("categoryId");

    const pending = ["draft", "waiting", "ready"] as PickingState[];

    const [inStockGroups, low, out, pendingReceipts, pendingDeliveries, scheduledInternals, activity] =
      await Promise.all([
        prisma.stockQuant.groupBy({
          by: ["productId"],
          where: { location: { type: { in: ON_HAND_TYPES } } },
          _sum: { quantity: true },
        }),
        prisma.alert.count({ where: { kind: "low_stock" } }),
        prisma.alert.count({ where: { kind: "out_of_stock" } }),
        prisma.picking.count({ where: { type: "receipt", state: { in: pending } } }),
        prisma.picking.count({ where: { type: "delivery", state: { in: pending } } }),
        prisma.picking.count({ where: { type: "internal", state: { in: pending } } }),
        prisma.picking.findMany({
          where: {
            ...(type ? { type } : {}),
            ...(state ? { state } : {}),
            ...(warehouseId ? { warehouseId } : {}),
            ...(locationId
              ? {
                  OR: [{ sourceLocationId: locationId }, { destLocationId: locationId }],
                }
              : {}),
            ...(categoryId ? { lines: { some: { product: { categoryId } } } } : {}),
          },
          include,
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

    const productsInStock = inStockGroups.filter((g) => Number(g._sum.quantity ?? 0) > 0).length;

    return NextResponse.json({
      kpis: {
        productsInStock,
        lowStock: low,
        outOfStock: out,
        pendingReceipts,
        pendingDeliveries,
        scheduledInternals,
      },
      activity: activity.map(serializePicking),
    });
  } catch (error) {
    return handleError(error);
  }
}
