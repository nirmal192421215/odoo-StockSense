import { prisma } from "@/lib/db";
import { StockError, Messages } from "@/lib/stock/errors";

export async function cancelPicking(
  pickingId: string,
  opts: { role: "inventory_manager" | "warehouse_staff" },
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Picking" WHERE id = ${pickingId} FOR UPDATE`;
    const picking = await tx.picking.findUnique({ where: { id: pickingId } });
    if (!picking) throw new StockError("Document not found.");
    if (picking.state === "done") {
      throw new StockError(Messages.doneCancel);
    }
    if (picking.state === "canceled") {
      return picking;
    }
    if (opts.role !== "inventory_manager" && picking.state !== "draft") {
      throw new StockError("Only a manager can cancel waiting or ready documents.");
    }
    return tx.picking.update({
      where: { id: pickingId },
      data: { state: "canceled" },
    });
  });
}
