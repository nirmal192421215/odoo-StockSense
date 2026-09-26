import { PrismaClient } from "@prisma/client";
import { createPicking } from "../lib/stock/createPicking";
import { confirmPicking } from "../lib/stock/confirmPicking";
import { validatePicking } from "../lib/stock/validatePicking";
import { D } from "../lib/decimal";
import { StockError } from "../lib/stock/errors";
import { ON_HAND_TYPES } from "../lib/stock/rules";

const prisma = new PrismaClient();

async function onHand(sku: string, locationName?: string) {
  const product = await prisma.product.findUniqueOrThrow({ where: { sku } });
  const quants = await prisma.stockQuant.findMany({
    where: {
      productId: product.id,
      location: locationName
        ? { name: locationName }
        : { type: { in: ON_HAND_TYPES } },
    },
    include: { location: true },
  });
  return quants.reduce((acc, q) => acc.add(D(q.quantity)), D(0));
}

async function loc(name: string) {
  return prisma.location.findFirstOrThrow({ where: { name } });
}

async function main() {
  const manager = await prisma.user.findUniqueOrThrow({
    where: { email: "manager@stocksense.dev" },
  });
  const steel = await prisma.product.findUniqueOrThrow({ where: { sku: "STL-001" } });
  const vendor = await prisma.partner.findFirstOrThrow({ where: { name: "Steel Vendor" } });
  const customer = await prisma.partner.findFirstOrThrow({
    where: { name: "Demo Customer" },
  });
  const wh1 = await prisma.warehouse.findUniqueOrThrow({ where: { code: "WH1" } });
  const mainStore = await loc("Main Store");
  const production = await loc("Production Rack");
  const vendors = await loc("Vendors");
  const customers = await loc("Customers");
  const loss = await loc("Inventory Loss");

  const start = await onHand("STL-001");
  if (!start.eq(0)) {
    throw new Error(`Steel must start at 0 for smoke, got ${start}`);
  }

  const receipt = await createPicking({
    type: "receipt",
    warehouseId: wh1.id,
    partnerId: vendor.id,
    sourceLocationId: vendors.id,
    destLocationId: mainStore.id,
    createdById: manager.id,
    lines: [
      {
        productId: steel.id,
        qty: 100,
        sourceLocationId: vendors.id,
        destLocationId: mainStore.id,
      },
    ],
  });
  await confirmPicking(receipt.id);
  await validatePicking(receipt.id, manager.id);
  const afterReceipt = await onHand("STL-001", "Main Store");
  if (!afterReceipt.eq(100)) throw new Error(`Expected 100 at Main Store, got ${afterReceipt}`);

  const transfer = await createPicking({
    type: "internal",
    warehouseId: wh1.id,
    sourceLocationId: mainStore.id,
    destLocationId: production.id,
    createdById: manager.id,
    lines: [
      {
        productId: steel.id,
        qty: 100,
        sourceLocationId: mainStore.id,
        destLocationId: production.id,
      },
    ],
  });
  await confirmPicking(transfer.id);
  await validatePicking(transfer.id, manager.id);
  if (!(await onHand("STL-001", "Main Store")).eq(0)) {
    throw new Error("Main Store should be 0 after transfer");
  }
  if (!(await onHand("STL-001", "Production Rack")).eq(100)) {
    throw new Error("Production should be 100 after transfer");
  }
  if (!(await onHand("STL-001")).eq(100)) {
    throw new Error("Company qty should still be 100");
  }

  const delivery = await createPicking({
    type: "delivery",
    warehouseId: wh1.id,
    partnerId: customer.id,
    sourceLocationId: production.id,
    destLocationId: customers.id,
    createdById: manager.id,
    lines: [
      {
        productId: steel.id,
        qty: 20,
        sourceLocationId: production.id,
        destLocationId: customers.id,
      },
    ],
  });
  await confirmPicking(delivery.id);
  await prisma.picking.update({
    where: { id: delivery.id },
    data: { picked: true, packed: true },
  });
  await validatePicking(delivery.id, manager.id);
  if (!(await onHand("STL-001", "Production Rack")).eq(80)) {
    throw new Error("Expected 80 after delivery");
  }

  const adj = await createPicking({
    type: "adjustment",
    warehouseId: wh1.id,
    sourceLocationId: loss.id,
    destLocationId: production.id,
    createdById: manager.id,
    reason: "Damaged in handling",
    lines: [
      {
        productId: steel.id,
        qty: 77,
        sourceLocationId: loss.id,
        destLocationId: production.id,
      },
    ],
  });
  await confirmPicking(adj.id);
  await validatePicking(adj.id, manager.id);
  const endProd = await onHand("STL-001", "Production Rack");
  const endCompany = await onHand("STL-001");
  if (!endProd.eq(77) || !endCompany.eq(77)) {
    throw new Error(`Expected 77 at Production, got loc=${endProd} company=${endCompany}`);
  }

  const oversell = await createPicking({
    type: "delivery",
    warehouseId: wh1.id,
    partnerId: customer.id,
    sourceLocationId: production.id,
    destLocationId: customers.id,
    createdById: manager.id,
    lines: [
      {
        productId: steel.id,
        qty: 999,
        sourceLocationId: production.id,
        destLocationId: customers.id,
      },
    ],
  });
  await confirmPicking(oversell.id);
  const waiting = await prisma.picking.findUniqueOrThrow({ where: { id: oversell.id } });
  if (waiting.state !== "waiting") {
    throw new Error(`Oversell should be waiting, got ${waiting.state}`);
  }
  await prisma.picking.update({
    where: { id: oversell.id },
    data: { state: "ready", picked: true, packed: true },
  });
  let threw = false;
  try {
    await validatePicking(oversell.id, manager.id);
  } catch (e) {
    threw = e instanceof StockError;
    if (!threw) throw e;
    console.log("Oversell blocked:", (e as Error).message);
  }
  if (!threw) throw new Error("Oversell must throw StockError");

  const ledger = await prisma.stockLedger.count({ where: { productId: steel.id } });
  if (ledger < 4) throw new Error(`Expected 4+ ledger rows, got ${ledger}`);

  console.log("stock:smoke passed — Steel 77 kg at Production, ledger", ledger);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
