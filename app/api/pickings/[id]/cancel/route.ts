import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { serializePicking } from "@/lib/serialize";
import { cancelPicking } from "@/lib/stock/cancelPicking";

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
    const user = await requireUser();
    const { id } = await ctx.params;
    await cancelPicking(id, { role: user.role });
    const picking = await prisma.picking.findUniqueOrThrow({ where: { id }, include });
    return NextResponse.json({ picking: serializePicking(picking) });
  } catch (error) {
    return handleError(error);
  }
}
