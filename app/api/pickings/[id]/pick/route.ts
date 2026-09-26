import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { serializePicking } from "@/lib/serialize";
import { StockError } from "@/lib/stock/errors";

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

export async function POST(_req: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const picking = await prisma.picking.findUnique({ where: { id } });
    if (!picking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (picking.type !== "delivery" || picking.state !== "ready") {
      throw new StockError("Only ready deliveries can be picked.");
    }
    const updated = await prisma.picking.update({
      where: { id },
      data: { picked: true },
      include,
    });
    return NextResponse.json({ picking: serializePicking(updated) });
  } catch (error) {
    return handleError(error);
  }
}
