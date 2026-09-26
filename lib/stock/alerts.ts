import type { Prisma } from "@prisma/client";
import { AlertKind } from "@prisma/client";
import { D } from "@/lib/decimal";
import { ON_HAND_TYPES } from "@/lib/stock/rules";

export async function refreshAlertsForProducts(
  tx: Prisma.TransactionClient,
  productIds: string[],
) {
  const unique = [...new Set(productIds)];
  for (const productId of unique) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) continue;

    const quants = await tx.stockQuant.findMany({
      where: { productId, location: { type: { in: ON_HAND_TYPES } } },
    });
    const onHand = quants.reduce((acc, q) => acc.add(D(q.quantity)), D(0));
    const minQty = D(product.minQty);

    let kind: AlertKind | null = null;
    if (onHand.lte(0)) kind = "out_of_stock";
    else if (minQty.gt(0) && onHand.lte(minQty)) kind = "low_stock";

    if (!kind) {
      await tx.alert.deleteMany({ where: { productId } });
      continue;
    }

    await tx.alert.upsert({
      where: { productId },
      create: { productId, kind, onHand, minQty },
      update: { kind, onHand, minQty },
    });
  }
}

export async function companyOnHand(
  tx: Prisma.TransactionClient | typeof import("@/lib/db").prisma,
  productId: string,
) {
  const quants = await tx.stockQuant.findMany({
    where: { productId, location: { type: { in: ON_HAND_TYPES } } },
  });
  return quants.reduce((acc, q) => acc.add(D(q.quantity)), D(0));
}
