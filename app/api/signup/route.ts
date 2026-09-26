import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validators";
import { handleError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body = signupSchema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash: await bcrypt.hash(body.password, 10),
        role: "warehouse_staff",
      },
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}
