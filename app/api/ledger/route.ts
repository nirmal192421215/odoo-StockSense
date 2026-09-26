import { NextResponse } from "next/server";
import type { PickingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { serializeLedger } from "@/lib/serialize";

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const locationId = searchParams.get("locationId");
    const type = searchParams.get("type") as PickingType | null;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const rows = await prisma.stockLedger.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(type ? { type } : {}),
        ...(locationId
          ? { OR: [{ fromLocationId: locationId }, { toLocationId: locationId }] }
          : {}),
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        product: true,
        fromLocation: true,
        toLocation: true,
        user: { select: { name: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ ledger: rows.map(serializeLedger) });
  } catch (error) {
    return handleError(error);
  }
}
