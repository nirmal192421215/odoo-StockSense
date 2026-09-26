import type { PickingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { D } from "@/lib/decimal";
import { StockError, Messages } from "@/lib/stock/errors";
import { locationsLegal } from "@/lib/stock/rules";
import { nextPickingName } from "@/lib/stock/sequence";
import { validatePicking } from "@/lib/stock/validatePicking";
import { confirmPicking } from "@/lib/stock/confirmPicking";

export type LineInput = {
  productId: string;
  qty: number | string;
  sourceLocationId: string;
  destLocationId: string;
};

export async function createPicking(input: {
  type: PickingType;
  warehouseId: string;
  partnerId?: string | null;
  sourceLocationId: string;
  destLocationId: string;
  createdById: string;
  reason?: string | null;
  notes?: string | null;
  lines: LineInput[];
  autoValidate?: boolean;
}) {
  if (input.lines.length === 0) {
    throw new StockError(Messages.empty);
  }

  const picking = await prisma.$transaction(async (tx) => {
    const name = await nextPickingName(tx, input.type);
    const src = await tx.location.findUnique({ where: { id: input.sourceLocationId } });
    const dest = await tx.location.findUnique({ where: { id: input.destLocationId } });
    if (!src || !dest) throw new StockError(Messages.locations);
    if (
      input.type !== "adjustment" &&
      !locationsLegal(input.type, src.type, dest.type, src.id, dest.id)
    ) {
      throw new StockError(Messages.locations);
    }

    for (const line of input.lines) {
      if (D(line.qty).lte(0)) throw new StockError(Messages.qty);
      const ls = await tx.location.findUnique({ where: { id: line.sourceLocationId } });
      const ld = await tx.location.findUnique({ where: { id: line.destLocationId } });
      if (!ls || !ld) throw new StockError(Messages.locations);
      if (
        input.type !== "adjustment" &&
        !locationsLegal(input.type, ls.type, ld.type, ls.id, ld.id)
      ) {
        throw new StockError(Messages.locations);
      }
    }

    return tx.picking.create({
      data: {
        name,
        type: input.type,
        warehouseId: input.warehouseId,
        partnerId: input.partnerId ?? null,
        sourceLocationId: input.sourceLocationId,
        destLocationId: input.destLocationId,
        createdById: input.createdById,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        lines: {
          create: input.lines.map((line) => ({
            productId: line.productId,
            qty: D(line.qty),
            sourceLocationId: line.sourceLocationId,
            destLocationId: line.destLocationId,
          })),
        },
      },
    });
  });

  if (input.autoValidate) {
    await confirmPicking(picking.id);
    return validatePicking(picking.id, input.createdById);
  }

  return picking;
}
