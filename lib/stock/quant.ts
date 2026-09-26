import type { Prisma } from "@prisma/client";
import { D } from "@/lib/decimal";

export async function lockQuant(
  tx: Prisma.TransactionClient,
  productId: string,
  locationId: string,
) {
  await tx.stockQuant.upsert({
    where: { productId_locationId: { productId, locationId } },
    create: { productId, locationId, quantity: 0 },
    update: {},
  });
  const rows = await tx.$queryRaw<{ id: string; quantity: string }[]>`
    SELECT id, quantity::text AS quantity
    FROM "StockQuant"
    WHERE "productId" = ${productId} AND "locationId" = ${locationId}
    FOR UPDATE
  `;
  return D(rows[0]?.quantity ?? 0);
}

export async function applyQuantDelta(
  tx: Prisma.TransactionClient,
  productId: string,
  locationId: string,
  delta: ReturnType<typeof D>,
) {
  await lockQuant(tx, productId, locationId);
  await tx.stockQuant.update({
    where: { productId_locationId: { productId, locationId } },
    data: { quantity: { increment: delta } },
  });
}
