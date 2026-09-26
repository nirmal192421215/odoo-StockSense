import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createPicking } from "../lib/stock/createPicking";
import { refreshAlertsForProducts } from "../lib/stock/alerts";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("StockSense!1", 10);

  // ─── Users ────────────────────────────────────────────────────────────────
  const manager = await prisma.user.upsert({
    where: { email: "manager@stocksense.dev" },
    update: {},
    create: {
      name: "Inventory Manager",
      email: "manager@stocksense.dev",
      passwordHash,
      role: "inventory_manager",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@stocksense.dev" },
    update: {},
    create: {
      name: "Warehouse Staff",
      email: "staff@stocksense.dev",
      passwordHash,
      role: "warehouse_staff",
    },
  });

  // ─── Sequences ────────────────────────────────────────────────────────────
  for (const prefix of ["IN", "OUT", "INT", "ADJ"]) {
    await prisma.pickingSequence.upsert({
      where: { prefix },
      update: {},
      create: { prefix, nextNumber: 1 },
    });
  }

  // ─── Warehouses ───────────────────────────────────────────────────────────
  const wh1 = await prisma.warehouse.upsert({
    where: { code: "WH1" },
    update: {},
    create: { name: "Main Warehouse", code: "WH1" },
  });
  const wh2 = await prisma.warehouse.upsert({
    where: { code: "WH2" },
    update: {},
    create: { name: "Warehouse 2", code: "WH2" },
  });

  // ─── Locations (idempotent via completeName) ───────────────────────────────
  async function upsertLocation(data: {
    name: string;
    completeName: string;
    type: "internal" | "supplier" | "customer" | "inventory_loss" | "production";
    warehouseId?: string;
  }) {
    const existing = await prisma.location.findFirst({
      where: { completeName: data.completeName },
    });
    if (existing) return existing;
    return prisma.location.create({ data });
  }

  const vendorLoc = await upsertLocation({
    name: "Vendors",
    completeName: "Partners/Vendors",
    type: "supplier",
  });
  const customerLoc = await upsertLocation({
    name: "Customers",
    completeName: "Partners/Customers",
    type: "customer",
  });
  const lossLoc = await upsertLocation({
    name: "Inventory Loss",
    completeName: "Virtual/Inventory Loss",
    type: "inventory_loss",
  });
  const mainStore = await upsertLocation({
    name: "Main Store",
    completeName: "WH1/Main Store",
    type: "internal",
    warehouseId: wh1.id,
  });
  await upsertLocation({
    name: "Production Rack",
    completeName: "WH1/Production Rack",
    type: "production",
    warehouseId: wh1.id,
  });
  await upsertLocation({
    name: "Stock",
    completeName: "WH2/Stock",
    type: "internal",
    warehouseId: wh2.id,
  });

  // ─── Categories ───────────────────────────────────────────────────────────
  const metals = await prisma.category.upsert({
    where: { name: "Metals" },
    update: {},
    create: { name: "Metals" },
  });
  const consumables = await prisma.category.upsert({
    where: { name: "Consumables" },
    update: {},
    create: { name: "Consumables" },
  });

  // ─── UoMs (no unique key — use findFirst) ─────────────────────────────────
  async function upsertUom(name: string, symbol: string) {
    const existing = await prisma.uom.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.uom.create({ data: { name, symbol } });
  }

  const kg = await upsertUom("Kilogram", "kg");
  const units = await upsertUom("Units", "Units");

  // ─── Partners ─────────────────────────────────────────────────────────────
  async function upsertPartner(name: string, type: "vendor" | "customer" | "both") {
    const existing = await prisma.partner.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.partner.create({ data: { name, type } });
  }

  const vendor = await upsertPartner("Steel Vendor", "vendor");
  await upsertPartner("Demo Customer", "customer");

  // ─── Products ─────────────────────────────────────────────────────────────
  const steel = await prisma.product.upsert({
    where: { sku: "STL-001" },
    update: {},
    create: {
      name: "Steel",
      sku: "STL-001",
      categoryId: metals.id,
      uomId: kg.id,
      minQty: 20,
    },
  });
  const gloves = await prisma.product.upsert({
    where: { sku: "GLV-001" },
    update: {},
    create: {
      name: "Gloves",
      sku: "GLV-001",
      categoryId: consumables.id,
      uomId: units.id,
      minQty: 10,
    },
  });

  // ─── Opening stock for Gloves (only if no quant exists yet) ──────────────
  const existingGlovesQuant = await prisma.stockQuant.findFirst({
    where: { productId: gloves.id },
  });
  if (!existingGlovesQuant) {
    await createPicking({
      type: "adjustment",
      warehouseId: wh1.id,
      sourceLocationId: lossLoc.id,
      destLocationId: mainStore.id,
      createdById: manager.id,
      reason: "Opening balance",
      lines: [
        {
          productId: gloves.id,
          qty: 50,
          sourceLocationId: lossLoc.id,
          destLocationId: mainStore.id,
        },
      ],
      autoValidate: true,
    });
  }

  await refreshAlertsForProducts(prisma, [steel.id, gloves.id]);

  console.log("✅ Seed complete.");
  console.log("   manager@stocksense.dev / StockSense!1");
  console.log("   staff@stocksense.dev   / StockSense!1");
  console.log("   Steel STL-001 on-hand: 0 (ready for live demo)");
  console.log("   Gloves GLV-001: 50 at WH1/Main Store");
  console.log("   Vendors location:", vendorLoc.id);
  console.log("   Customers location:", customerLoc.id);
  console.log("   Steel Vendor partner:", vendor.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
