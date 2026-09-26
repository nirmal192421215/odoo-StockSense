import { prisma } from "@/lib/db";
import { D } from "@/lib/decimal";
import { StockError, Messages } from "@/lib/stock/errors";
import { isPhysical } from "@/lib/stock/rules";
import { lockQuant } from "@/lib/stock/quant";

export async function confirmPicking(pickingId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Picking" WHERE id = ${pickingId} FOR UPDATE`;
    const picking = await tx.picking.findUnique({
      where: { id: pickingId },
      include: {
        lines: {
          include: {
            product: true,
            sourceLocation: true,
          },
        },
      },
    });
    if (!picking) throw new StockError("Document not found.");
    if (picking.state !== "draft" && picking.state !== "waiting") {
      throw new StockError(`Cannot confirm a ${picking.state} document.`);
    }
    if (picking.lines.length === 0) {
      throw new StockError(Messages.empty);
    }

    if (picking.type === "receipt" || picking.type === "adjustment") {
      return tx.picking.update({
        where: { id: pickingId },
        data: { state: "ready" },
      });
    }

    let ready = true;
    for (const line of picking.lines) {
      if (!isPhysical(line.sourceLocation.type)) continue;
      const have = await lockQuant(tx, line.productId, line.sourceLocationId);
      if (have.lt(D(line.qty))) {
        ready = false;
        break;
      }
    }

    return tx.picking.update({
      where: { id: pickingId },
      data: { state: ready ? "ready" : "waiting" },
    });
  });
}
