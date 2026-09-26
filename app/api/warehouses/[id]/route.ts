import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/http";
import { Messages } from "@/lib/stock/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireManager();
    const { id } = await ctx.params;
    await prisma.warehouse.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: Messages.staffDelete }, { status: 403 });
    }
    return handleError(error);
  }
}
