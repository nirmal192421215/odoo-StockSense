import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { num } from "@/lib/decimal";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const quants = await prisma.stockQuant.findMany({
      where: { productId: id },
      include: { location: true },
      orderBy: { location: { completeName: "asc" } },
    });
    return NextResponse.json({
      quants: quants.map((q) => ({
        location: q.location,
        quantity: num(q.quantity),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
