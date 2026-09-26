import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user: full });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const { name } = (await req.json()) as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const full = await prisma.user.update({
      where: { id: user.id },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ user: full });
  } catch (error) {
    return handleError(error);
  }
}
