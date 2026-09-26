import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { ON_HAND_TYPES } from "@/lib/stock/rules";

export async function GET() {
  try {
    await requireUser();

    // 1. Fetch all active products with quants, uom, category, and alert
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        uom: true,
        category: true,
        alert: true,
        quants: {
          where: { location: { type: { in: ON_HAND_TYPES } } },
        },
      },
    });

    // 2. Fetch ledger outbound moves in the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentLedger = await prisma.stockLedger.findMany({
      where: {
        occurredAt: { gte: fourteenDaysAgo },
        fromLocation: { type: { in: ON_HAND_TYPES } },
        toLocation: { type: { notIn: ON_HAND_TYPES } }, // goods leaving inventory
      },
      select: {
        productId: true,
        qty: true,
      },
    });

    const consumptionMap: Record<string, number> = {};
    for (const entry of recentLedger) {
      const q = Math.abs(Number(entry.qty));
      consumptionMap[entry.productId] = (consumptionMap[entry.productId] || 0) + q;
    }

    let healthyCount = 0;
    let urgentCount = 0;
    let warningCount = 0;

    const items = products.map((p) => {
      const onHand = p.quants.reduce((sum, q) => sum + Number(q.quantity), 0);
      const consumed14d = consumptionMap[p.id] || 0;
      // Daily burn rate (minimum baseline 0.5 to provide forecast guidance even with fresh data)
      const dailyBurn = consumed14d > 0 ? consumed14d / 14 : 1.2;
      const daysOfInventory = dailyBurn > 0 ? Math.round((onHand / dailyBurn) * 10) / 10 : 999;
      const minQty = Number(p.minQty);

      let urgency: "critical" | "warning" | "optimal" = "optimal";
      let message = "Stock levels optimal for current demand.";

      if (onHand <= 0) {
        urgency = "critical";
        message = "Stockout! Zero units on hand.";
        urgentCount++;
      } else if (onHand <= minQty || daysOfInventory <= 5) {
        urgency = "critical";
        message = `Projected stockout in ~${daysOfInventory} days at current velocity.`;
        urgentCount++;
      } else if (daysOfInventory <= 14) {
        urgency = "warning";
        message = `Reorder recommended soon. ~${daysOfInventory} days remaining.`;
        warningCount++;
      } else {
        healthyCount++;
      }

      // Reorder suggestion
      const suggestedReorder = Math.max(minQty > 0 ? minQty * 2 : 100, Math.ceil(dailyBurn * 30));

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        uom: p.uom.symbol,
        onHand,
        minQty,
        dailyBurn: Math.round(dailyBurn * 100) / 100,
        daysOfInventory,
        urgency,
        message,
        suggestedReorder,
      };
    });

    const totalProducts = products.length;
    const healthScore = totalProducts > 0
      ? Math.max(10, Math.round(((healthyCount + warningCount * 0.5) / totalProducts) * 100))
      : 100;

    return NextResponse.json({
      healthScore,
      summary: {
        totalProducts,
        healthyCount,
        warningCount,
        urgentCount,
      },
      forecasts: items.sort((a, b) => a.daysOfInventory - b.daysOfInventory),
    });
  } catch (error) {
    return handleError(error);
  }
}
