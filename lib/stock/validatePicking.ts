import { prisma } from "@/lib/db";
import { D, qtyStr } from "@/lib/decimal";
import { StockError, Messages, insufficient } from "@/lib/stock/errors";
import { locationsLegal, isPhysical } from "@/lib/stock/rules";
import { applyQuantDelta, lockQuant } from "@/lib/stock/quant";
import { refreshAlertsForProducts } from "@/lib/stock/alerts";

type ExecMove = {
  productId: string;
  sku: string;
  qty: ReturnType<typeof D>;
  sourceLocationId: string;
  destLocationId: string;
  sourceName: string;
  sourceType: "internal" | "supplier" | "customer" | "inventory_loss" | "production";
};

export async function validatePicking(pickingId: string, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Picking" WHERE id = ${pickingId} FOR UPDATE`;
      const picking = await tx.picking.findUnique({
        where: { id: pickingId },
        include: {
          lines: {
            include: {
              product: true,
              sourceLocation: true,
              destLocation: true,
            },
          },
          destLocation: true,
          sourceLocation: true,
        },
      });
      if (!picking) throw new StockError("Document not found.");
      if (picking.state !== "ready") {
        throw new StockError("Only ready documents can be validated.");
      }
      if (picking.lines.length === 0) {
        throw new StockError(Messages.empty);
      }
      if (picking.type === "delivery" && !(picking.picked && picking.packed)) {
        throw new StockError(Messages.pickPack);
      }
      if (picking.type === "adjustment" && !picking.reason?.trim()) {
        throw new StockError(Messages.reason);
      }

      const moves: ExecMove[] = [];

      if (picking.type === "adjustment") {
        const loss = await tx.location.findFirst({
          where: { type: "inventory_loss" },
        });
        if (!loss) throw new StockError("Inventory loss location is missing.");

        for (const line of picking.lines) {
          if (D(line.qty).lte(0)) throw new StockError(Messages.qty);
          const countedLoc = line.destLocation;
          if (!isPhysical(countedLoc.type)) {
            throw new StockError(Messages.locations);
          }
          const systemQty = await lockQuant(tx, line.productId, countedLoc.id);
          const counted = D(line.qty);
          const delta = counted.sub(systemQty);
          if (delta.eq(0)) {
            throw new StockError("No difference to post for this adjustment.");
          }
          if (delta.gt(0)) {
            moves.push({
              productId: line.productId,
              sku: line.product.sku,
              qty: delta,
              sourceLocationId: loss.id,
              destLocationId: countedLoc.id,
              sourceName: loss.completeName,
              sourceType: loss.type,
            });
          } else {
            moves.push({
              productId: line.productId,
              sku: line.product.sku,
              qty: delta.abs(),
              sourceLocationId: countedLoc.id,
              destLocationId: loss.id,
              sourceName: countedLoc.completeName,
              sourceType: countedLoc.type,
            });
          }
        }
      } else {
        for (const line of picking.lines) {
          if (D(line.qty).lte(0)) throw new StockError(Messages.qty);
          if (
            !locationsLegal(
              picking.type,
              line.sourceLocation.type,
              line.destLocation.type,
              line.sourceLocationId,
              line.destLocationId,
            )
          ) {
            throw new StockError(Messages.locations);
          }
          moves.push({
            productId: line.productId,
            sku: line.product.sku,
            qty: D(line.qty),
            sourceLocationId: line.sourceLocationId,
            destLocationId: line.destLocationId,
            sourceName: line.sourceLocation.completeName,
            sourceType: line.sourceLocation.type,
          });
        }
      }

      for (const move of moves) {
        if (isPhysical(move.sourceType)) {
          const have = await lockQuant(tx, move.productId, move.sourceLocationId);
          if (have.lt(move.qty)) {
            throw insufficient(
              move.sku,
              move.sourceName,
              qtyStr(have),
              qtyStr(move.qty),
            );
          }
        }
      }

      for (const move of moves) {
        await tx.stockMove.create({
          data: {
            pickingId: picking.id,
            productId: move.productId,
            qty: move.qty,
            sourceLocationId: move.sourceLocationId,
            destLocationId: move.destLocationId,
          },
        });
        await tx.stockLedger.create({
          data: {
            productId: move.productId,
            fromLocationId: move.sourceLocationId,
            toLocationId: move.destLocationId,
            qty: move.qty,
            pickingId: picking.id,
            pickingName: picking.name,
            type: picking.type,
            userId,
            reason: picking.reason,
          },
        });
        await applyQuantDelta(tx, move.productId, move.sourceLocationId, move.qty.neg());
        await applyQuantDelta(tx, move.productId, move.destLocationId, move.qty);
      }

      const updated = await tx.picking.update({
        where: { id: picking.id },
        data: {
          state: "done",
          validatedAt: new Date(),
          validatedById: userId,
        },
      });

      await refreshAlertsForProducts(
        tx,
        moves.map((m) => m.productId),
      );

      return updated;
    },
    { timeout: 35000, maxWait: 15000 },
  );
}
