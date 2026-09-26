import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";

export async function GET() {
  try {
    await requireUser();

    const warehouses = await prisma.warehouse.findMany({
      include: {
        locations: {
          where: { type: "internal" },
          include: {
            quants: {
              where: { quantity: { gt: 0 } },
              include: {
                product: {
                  include: {
                    uom: true,
                    category: true,
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { code: "asc" },
    });

    const mapped = warehouses.map((wh) => {
      let totalStockUnits = 0;
      let totalSkus = 0;

      const locations = wh.locations.map((loc, idx) => {
        const items = loc.quants.map((q) => {
          const qty = Number(q.quantity);
          totalStockUnits += qty;
          return {
            productId: q.productId,
            sku: q.product.sku,
            name: q.product.name,
            category: q.product.category.name,
            uom: q.product.uom.symbol,
            quantity: qty,
          };
        });

        totalSkus += items.length;

        // Visual layout grid calculation
        const bayRow = Math.floor(idx / 3) + 1;
        const bayCol = (idx % 3) + 1;
        // Estimated maximum capacity per location for heatmap (e.g. 500 units nominal)
        const nominalCapacity = 300;
        const locationUnits = items.reduce((sum, item) => sum + item.quantity, 0);
        const utilizationPercent = Math.min(100, Math.round((locationUnits / nominalCapacity) * 100));

        let status: "optimal" | "warning" | "empty" | "full" = "optimal";
        if (locationUnits === 0) status = "empty";
        else if (utilizationPercent > 80) status = "warning";
        else if (utilizationPercent >= 100) status = "full";

        return {
          id: loc.id,
          name: loc.name,
          completeName: loc.completeName,
          type: loc.type,
          gridPosition: { row: bayRow, col: bayCol },
          totalUnits: locationUnits,
          utilizationPercent,
          status,
          items,
        };
      });

      return {
        id: wh.id,
        name: wh.name,
        code: wh.code,
        address: "Main Logistics Facility",
        totalStockUnits,
        totalSkus,
        locationCount: wh.locations.length,
        locations,
      };
    });

    return NextResponse.json({ warehouses: mapped });
  } catch (error) {
    return handleError(error);
  }
}
