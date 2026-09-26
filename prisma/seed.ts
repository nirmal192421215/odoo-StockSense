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
    create: { name: "Central Fulfillment Hub", code: "WH1" },
  });
  const wh2 = await prisma.warehouse.upsert({
    where: { code: "WH2" },
    update: {},
    create: { name: "Secondary Annex", code: "WH2" },
  });

  // ─── Locations ────────────────────────────────────────────────────────────
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
  const productionRack = await upsertLocation({
    name: "Production Rack",
    completeName: "WH1/Production Rack",
    type: "production",
    warehouseId: wh1.id,
  });
  const wh2Stock = await upsertLocation({
    name: "Stock",
    completeName: "WH2/Stock",
    type: "internal",
    warehouseId: wh2.id,
  });

  // ─── Categories ───────────────────────────────────────────────────────────
  async function upsertCategory(name: string) {
    return prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const catMetals = await upsertCategory("Raw Metals");
  const catConsumables = await upsertCategory("Consumables");
  const catElectrical = await upsertCategory("Electrical & Hardware");
  const catSafety = await upsertCategory("Safety & PPE");
  const catPackaging = await upsertCategory("Packaging");

  // ─── UoMs ─────────────────────────────────────────────────────────────────
  async function upsertUom(name: string, symbol: string) {
    const existing = await prisma.uom.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.uom.create({ data: { name, symbol } });
  }

  const uomKg = await upsertUom("Kilogram", "kg");
  const uomUnits = await upsertUom("Units", "Units");
  const uomMeters = await upsertUom("Meters", "m");
  const uomLiters = await upsertUom("Liters", "L");

  // ─── Partners ─────────────────────────────────────────────────────────────
  async function upsertPartner(name: string, type: "vendor" | "customer" | "both") {
    const existing = await prisma.partner.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.partner.create({ data: { name, type } });
  }

  const vendorSteel = await upsertPartner("Steel Vendor", "vendor");
  const vendorElectrical = await upsertPartner("Apex Industrial Supplies", "vendor");
  const customerDemo = await upsertPartner("Demo Customer", "customer");
  const customerTitan = await upsertPartner("Titan Manufacturing Ltd", "customer");

  // ─── Products (10 total) ──────────────────────────────────────────────────
  async function upsertProduct(data: {
    sku: string;
    name: string;
    categoryId: string;
    uomId: string;
    minQty: number;
  }) {
    return prisma.product.upsert({
      where: { sku: data.sku },
      update: {},
      create: data,
    });
  }

  // 1. Steel Sheet (Keep at 0 for live demonstration of the Steel Story!)
  const pSteel = await upsertProduct({
    sku: "STL-001",
    name: "Cold-Rolled Steel Sheet 2mm",
    categoryId: catMetals.id,
    uomId: uomKg.id,
    minQty: 20,
  });

  // 2. Heavy Duty Gloves
  const pGloves = await upsertProduct({
    sku: "GLV-001",
    name: "Heavy Duty Nitrile Gloves",
    categoryId: catConsumables.id,
    uomId: uomUnits.id,
    minQty: 25,
  });

  // 3. Aluminum Alloy Bar
  const pAluminum = await upsertProduct({
    sku: "ALU-102",
    name: "Aluminum Structural Bar 6061",
    categoryId: catMetals.id,
    uomId: uomKg.id,
    minQty: 30,
  });

  // 4. Copper Wiring Spool
  const pCopper = await upsertProduct({
    sku: "COP-301",
    name: "Insulated Copper Wire Spool",
    categoryId: catElectrical.id,
    uomId: uomMeters.id,
    minQty: 100,
  });

  // 5. Hex Bolts M8
  const pBolts = await upsertProduct({
    sku: "BOL-881",
    name: "Hex Flange Bolts M8x50mm",
    categoryId: catElectrical.id,
    uomId: uomUnits.id,
    minQty: 200,
  });

  // 6. High-Bay Industrial LED (Low Stock intentionally to demonstrate warning!)
  const pLed = await upsertProduct({
    sku: "LED-505",
    name: "High-Bay Industrial LED Lamp 150W",
    categoryId: catElectrical.id,
    uomId: uomUnits.id,
    minQty: 50,
  });

  // 7. Safety Helmet
  const pHelmet = await upsertProduct({
    sku: "HLM-009",
    name: "ANSI High-Impact Safety Helmet",
    categoryId: catSafety.id,
    uomId: uomUnits.id,
    minQty: 20,
  });

  // 8. Hydraulic Machine Lubricant
  const pOil = await upsertProduct({
    sku: "OIL-404",
    name: "ISO VG 46 Premium Hydraulic Oil",
    categoryId: catConsumables.id,
    uomId: uomLiters.id,
    minQty: 40,
  });

  // 9. Precision Ball Bearing
  const pBearing = await upsertProduct({
    sku: "BRG-620",
    name: "Sealed Deep Groove Ball Bearing 6204",
    categoryId: catElectrical.id,
    uomId: uomUnits.id,
    minQty: 50,
  });

  // 10. Heavy Duty Cardboard Shipping Carton
  const pBox = await upsertProduct({
    sku: "CRT-110",
    name: "Reinforced 3-Ply Shipping Carton",
    categoryId: catPackaging.id,
    uomId: uomUnits.id,
    minQty: 150,
  });

  const allProducts = [
    pSteel,
    pGloves,
    pAluminum,
    pCopper,
    pBolts,
    pLed,
    pHelmet,
    pOil,
    pBearing,
    pBox,
  ];

  // ─── Opening Balances ─────────────────────────────────────────────────────
  // We seed stock for products (except STL-001 which stays 0 for live receipt walkthrough)
  const initialStock = [
    { product: pGloves,   qty: 85,  loc: mainStore },
    { product: pAluminum, qty: 140, loc: mainStore },
    { product: pCopper,   qty: 450, loc: mainStore },
    { product: pBolts,    qty: 900, loc: mainStore },
    { product: pLed,      qty: 15,  loc: mainStore }, // 15 < 50 minQty -> triggers Low Stock alert
    { product: pHelmet,   qty: 60,  loc: mainStore },
    { product: pOil,      qty: 120, loc: mainStore },
    { product: pBearing,  qty: 180, loc: mainStore },
    { product: pBox,      qty: 350, loc: wh2Stock },
  ];

  for (const item of initialStock) {
    const existing = await prisma.stockQuant.findFirst({
      where: { productId: item.product.id },
    });
    if (!existing) {
      await createPicking({
        type: "adjustment",
        warehouseId: item.loc.warehouseId || wh1.id,
        sourceLocationId: lossLoc.id,
        destLocationId: item.loc.id,
        createdById: manager.id,
        reason: "Initial catalogue opening inventory",
        lines: [
          {
            productId: item.product.id,
            qty: item.qty,
            sourceLocationId: lossLoc.id,
            destLocationId: item.loc.id,
          },
        ],
        autoValidate: true,
      });
    }
  }

  // ─── Pending Operations (for rich dashboard KPIs) ─────────────────────────
  const existingReceipt = await prisma.picking.findFirst({
    where: { type: "receipt", state: "ready" },
  });
  if (!existingReceipt) {
    // 1. Pending Receipt: Incoming Copper & Aluminum
    const p1 = await createPicking({
      type: "receipt",
      warehouseId: wh1.id,
      partnerId: vendorElectrical.id,
      sourceLocationId: vendorLoc.id,
      destLocationId: mainStore.id,
      createdById: manager.id,
      lines: [
        { productId: pCopper.id, qty: 200, sourceLocationId: vendorLoc.id, destLocationId: mainStore.id },
        { productId: pAluminum.id, qty: 50, sourceLocationId: vendorLoc.id, destLocationId: mainStore.id },
      ],
    });
    await prisma.picking.update({ where: { id: p1.id }, data: { state: "ready" } });

    // 2. Pending Delivery: Outgoing Helmets & Gloves to Titan
    const p2 = await createPicking({
      type: "delivery",
      warehouseId: wh1.id,
      partnerId: customerTitan.id,
      sourceLocationId: mainStore.id,
      destLocationId: customerLoc.id,
      createdById: manager.id,
      lines: [
        { productId: pHelmet.id, qty: 20, sourceLocationId: mainStore.id, destLocationId: customerLoc.id },
        { productId: pGloves.id, qty: 30, sourceLocationId: mainStore.id, destLocationId: customerLoc.id },
      ],
    });
    await prisma.picking.update({ where: { id: p2.id }, data: { state: "waiting" } });

    // 3. Scheduled Internal Transfer: Main Store to Production Rack
    const p3 = await createPicking({
      type: "internal",
      warehouseId: wh1.id,
      sourceLocationId: mainStore.id,
      destLocationId: productionRack.id,
      createdById: manager.id,
      lines: [
        { productId: pBearing.id, qty: 40, sourceLocationId: mainStore.id, destLocationId: productionRack.id },
        { productId: pBolts.id, qty: 100, sourceLocationId: mainStore.id, destLocationId: productionRack.id },
      ],
    });
    await prisma.picking.update({ where: { id: p3.id }, data: { state: "ready" } });
  }

  // ─── Refresh Alerts ───────────────────────────────────────────────────────
  await refreshAlertsForProducts(
    prisma,
    allProducts.map((p) => p.id),
  );

  console.log("✅ Seed complete.");
  console.log("   Catalogue: 10 industrial products created.");
  console.log("   Steel (STL-001): 0 kg on-hand (ready for live demo story).");
  console.log("   LED Lamp (LED-505): 15 units (triggers Low Stock alert).");
  console.log("   Active Receipts, Deliveries, and Internal Transfers scheduled.");
  console.log("   Credentials: manager@stocksense.dev / staff@stocksense.dev (StockSense!1)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
