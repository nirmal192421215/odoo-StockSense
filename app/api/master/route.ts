import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";

export async function GET() {
  try {
    await requireUser();
    const [categories, uoms, partners, warehouses, locations] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.uom.findMany({ orderBy: { name: "asc" } }),
      prisma.partner.findMany({ orderBy: { name: "asc" } }),
      prisma.warehouse.findMany({ orderBy: { code: "asc" } }),
      prisma.location.findMany({ orderBy: { completeName: "asc" } }),
    ]);
    return NextResponse.json({ categories, uoms, partners, warehouses, locations });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireManager();
    const body = (await req.json()) as {
      entity: "category" | "uom" | "partner" | "warehouse" | "location";
      data: Record<string, string>;
    };
    if (body.entity === "category") {
      const row = await prisma.category.create({ data: { name: body.data.name } });
      return NextResponse.json({ row });
    }
    if (body.entity === "uom") {
      const row = await prisma.uom.create({
        data: { name: body.data.name, symbol: body.data.symbol },
      });
      return NextResponse.json({ row });
    }
    if (body.entity === "partner") {
      const row = await prisma.partner.create({
        data: {
          name: body.data.name,
          type: body.data.type as "vendor" | "customer" | "both",
        },
      });
      return NextResponse.json({ row });
    }
    if (body.entity === "warehouse") {
      const row = await prisma.warehouse.create({
        data: { name: body.data.name, code: body.data.code.toUpperCase() },
      });
      return NextResponse.json({ row });
    }
    if (body.entity === "location") {
      const warehouse = body.data.warehouseId
        ? await prisma.warehouse.findUnique({ where: { id: body.data.warehouseId } })
        : null;
      const completeName = warehouse
        ? `${warehouse.code}/${body.data.name}`
        : body.data.name;
      const row = await prisma.location.create({
        data: {
          name: body.data.name,
          completeName,
          type: body.data.type as "internal" | "supplier" | "customer" | "inventory_loss" | "production",
          warehouseId: body.data.warehouseId || null,
        },
      });
      return NextResponse.json({ row });
    }
    return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}
