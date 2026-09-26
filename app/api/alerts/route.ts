import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { num } from "@/lib/decimal";

export async function GET() {
  try {
    await requireUser();
    const alerts = await prisma.alert.findMany({
      include: { product: { include: { uom: true } } },
      orderBy: { kind: "asc" },
    });
    return NextResponse.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        kind: a.kind,
        onHand: num(a.onHand),
        minQty: num(a.minQty),
        product: a.product,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
