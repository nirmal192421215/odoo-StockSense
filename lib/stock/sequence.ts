import type { Prisma, PickingType } from "@prisma/client";
import { prefixFor } from "@/lib/stock/rules";

export async function nextPickingName(tx: Prisma.TransactionClient, type: PickingType) {
  const prefix = prefixFor(type);
  await tx.$queryRaw`SELECT * FROM "PickingSequence" WHERE prefix = ${prefix} FOR UPDATE`;
  const seq = await tx.pickingSequence.findUnique({ where: { prefix } });
  if (!seq) {
    throw new Error(`Missing picking sequence for ${prefix}`);
  }
  const name = `${prefix}/${String(seq.nextNumber).padStart(5, "0")}`;
  await tx.pickingSequence.update({
    where: { prefix },
    data: { nextNumber: seq.nextNumber + 1 },
  });
  return name;
}
