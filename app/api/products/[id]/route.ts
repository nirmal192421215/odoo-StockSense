import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { productSchema } from "@/lib/validators";
import { serializeProduct } from "@/lib/serialize";
import { companyOnHand } from "@/lib/stock/alerts";
import { Messages } from "@/lib/stock/errors";
import { num } from "@/lib/decimal";
import { refreshAlertsForProducts } from "@/lib/stock/alerts";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, uom: true, alert: true, quants: { include: { location: true } } },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      product: serializeProduct({
        ...product,
        onHand: num(await companyOnHand(prisma, product.id)),
      }),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireManager();
    const { id } = await ctx.params;
    const body = productSchema.partial().parse(await req.json());
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        sku: body.sku?.trim().toUpperCase(),
        categoryId: body.categoryId,
        uomId: body.uomId,
        minQty: body.minQty,
      },
      include: { category: true, uom: true, alert: true, quants: { include: { location: true } } },
    });
    await prisma.$transaction((tx) => refreshAlertsForProducts(tx, [id]));
    return NextResponse.json({
      product: serializeProduct({
        ...product,
        onHand: num(await companyOnHand(prisma, product.id)),
      }),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (user.role !== "inventory_manager") {
      return NextResponse.json({ error: Messages.staffDelete }, { status: 403 });
    }
    const { id } = await ctx.params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
