import { prisma } from "@/lib/db";
import { D } from "@/lib/decimal";
import { isPhysical } from "@/lib/stock/rules";

export async function sourceQty(productId: string, locationId: string) {
  const quant = await prisma.stockQuant.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });
  return D(quant?.quantity ?? 0);
}

export async function linesAvailable(
  lines: {
    productId: string;
    qty: ReturnType<typeof D> | number | string;
    sourceLocationId: string;
    sourceType: Parameters<typeof isPhysical>[0];
    sku: string;
    locationName: string;
  }[],
) {
  for (const line of lines) {
    if (!isPhysical(line.sourceType)) continue;
    const have = await sourceQty(line.productId, line.sourceLocationId);
    const need = D(line.qty);
    if (have.lt(need)) {
      return {
        ok: false as const,
        sku: line.sku,
        locationName: line.locationName,
        have,
        need,
      };
    }
  }
  return { ok: true as const };
}
