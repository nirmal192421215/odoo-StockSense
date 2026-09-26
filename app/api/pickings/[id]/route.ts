import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { pickingSchema } from "@/lib/validators";
import { serializePicking } from "@/lib/serialize";
import { StockError } from "@/lib/stock/errors";
import { D } from "@/lib/decimal";

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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const picking = await prisma.picking.findUnique({ where: { id }, include });
    if (!picking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ picking: serializePicking(picking) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const picking = await prisma.picking.findUnique({ where: { id } });
    if (!picking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (picking.state === "done" || picking.state === "canceled") {
      throw new StockError("This document can no longer be edited.");
    }
    const body = pickingSchema.partial().parse(await req.json());
    if (picking.state !== "draft" && body.lines) {
      throw new StockError("Only draft documents can be edited.");
    }
    if (picking.state === "draft" && body.lines) {
      await prisma.$transaction(async (tx) => {
        await tx.pickingLine.deleteMany({ where: { pickingId: id } });
        await tx.pickingLine.createMany({
          data: body.lines!.map((line) => ({
            pickingId: id,
            productId: line.productId,
            qty: D(line.qty),
            sourceLocationId: line.sourceLocationId,
            destLocationId: line.destLocationId,
          })),
        });
      });
    }
    const updated = await prisma.picking.update({
      where: { id },
      data: {
        warehouseId: body.warehouseId,
        partnerId: body.partnerId,
        sourceLocationId: body.sourceLocationId,
        destLocationId: body.destLocationId,
        reason: body.reason,
        notes: body.notes,
      },
      include,
    });
    return NextResponse.json({ picking: serializePicking(updated) });
  } catch (error) {
    return handleError(error);
  }
}
