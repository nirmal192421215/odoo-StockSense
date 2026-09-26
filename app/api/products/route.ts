import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { productSchema } from "@/lib/validators";
import { serializeProduct } from "@/lib/serialize";
import { companyOnHand } from "@/lib/stock/alerts";
import { createPicking } from "@/lib/stock/createPicking";
import { Messages } from "@/lib/stock/errors";
import { num } from "@/lib/decimal";
import { ON_HAND_TYPES } from "@/lib/stock/rules";

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const categoryId = searchParams.get("categoryId");
    const products = await prisma.product.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        uom: true,
        alert: true,
        quants: { include: { location: true } },
      },
      orderBy: { sku: "asc" },
    });
    const rows = await Promise.all(
      products.map(async (p) => {
        const onHand = num(await companyOnHand(prisma, p.id));
        return serializeProduct({ ...p, onHand });
      }),
    );
    return NextResponse.json({ products: rows });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireManager();
    const body = productSchema.parse(await req.json());
    const existing = await prisma.product.findUnique({ where: { sku: body.sku.trim() } });
    if (existing) {
      return NextResponse.json({ error: Messages.sku }, { status: 400 });
    }
    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku.trim().toUpperCase(),
        categoryId: body.categoryId,
        uomId: body.uomId,
        minQty: body.minQty,
      },
      include: { category: true, uom: true, alert: true, quants: { include: { location: true } } },
    });

    if (body.initialQty && body.initialQty > 0) {
      if (!body.initialLocationId) {
        return NextResponse.json({ error: "Opening stock needs a location." }, { status: 400 });
      }
      const loc = await prisma.location.findUnique({ where: { id: body.initialLocationId } });
      if (!loc || !ON_HAND_TYPES.includes(loc.type)) {
        return NextResponse.json({ error: "Opening stock must go to an internal location." }, { status: 400 });
      }
      const loss = await prisma.location.findFirst({ where: { type: "inventory_loss" } });
      const warehouseId = loc.warehouseId ?? (await prisma.warehouse.findFirst())?.id;
      if (!loss || !warehouseId) {
        return NextResponse.json({ error: "Missing warehouse or inventory loss location." }, { status: 400 });
      }
      await createPicking({
        type: "adjustment",
        warehouseId,
        sourceLocationId: loss.id,
        destLocationId: loc.id,
        createdById: user.id,
        reason: "Opening balance",
        lines: [
          {
            productId: product.id,
            qty: body.initialQty,
            sourceLocationId: loss.id,
            destLocationId: loc.id,
          },
        ],
        autoValidate: true,
      });
    }

    const fresh = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { category: true, uom: true, alert: true, quants: { include: { location: true } } },
    });
    return NextResponse.json({
      product: serializeProduct({
        ...fresh,
        onHand: num(await companyOnHand(prisma, fresh.id)),
      }),
    });
  } catch (error) {
    return handleError(error);
  }
}
