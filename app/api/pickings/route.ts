import { NextResponse } from "next/server";
import type { PickingState, PickingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { pickingSchema } from "@/lib/validators";
import { serializePicking } from "@/lib/serialize";
import { createPicking } from "@/lib/stock/createPicking";

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
    const pickings = await prisma.picking.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(state ? { state } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(locationId
          ? {
              OR: [
                { sourceLocationId: locationId },
                { destLocationId: locationId },
                { lines: { some: { OR: [{ sourceLocationId: locationId }, { destLocationId: locationId }] } } },
              ],
            }
          : {}),
        ...(categoryId ? { lines: { some: { product: { categoryId } } } } : {}),
      },
      include,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ pickings: pickings.map(serializePicking) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = pickingSchema.parse(await req.json());
    const created = await createPicking({
      ...body,
      createdById: user.id,
    });
    const picking = await prisma.picking.findUniqueOrThrow({
      where: { id: created.id },
      include,
    });
    return NextResponse.json({ picking: serializePicking(picking) });
  } catch (error) {
    return handleError(error);
  }
}
