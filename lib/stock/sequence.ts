import type { Prisma, PickingType } from "@prisma/client";
import { prefixFor } from "@/lib/stock/rules";

export async function nextPickingName(
  tx: Prisma.TransactionClient,
  type: PickingType,
  warehouseCode?: string | null,
) {
  const prefix = prefixFor(type);
  await tx.$queryRaw`SELECT * FROM "PickingSequence" WHERE prefix = ${prefix} FOR UPDATE`;
  const seq = await tx.pickingSequence.findUnique({ where: { prefix } });
  if (!seq) {
    throw new Error(`Missing picking sequence for ${prefix}`);
  }
  const num = String(seq.nextNumber).padStart(5, "0");
  // Format: WH1/IN/00001  (matches the Excalidraw wireframe spec)
  const name = warehouseCode
    ? `${warehouseCode}/${prefix}/${num}`
    : `${prefix}/${num}`;
  await tx.pickingSequence.update({
    where: { prefix },
    data: { nextNumber: seq.nextNumber + 1 },
  });
  return name;
}
