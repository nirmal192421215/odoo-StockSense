import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const { email, otp, password } = (await req.json()) as {
      email?: string;
      otp?: string;
      password?: string;
    };
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !otp || !password || password.length < 8) {
      return NextResponse.json({ error: "Email, OTP, and a password (8+ chars) are required." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
    }

    const demo = process.env.AUTH_DEMO_OTP;
    let valid = Boolean(demo && otp === demo);
    if (!valid) {
      const row = await prisma.passwordResetOtp.findFirst({
        where: { email: normalized, consumedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      });
      if (row && (await bcrypt.compare(otp, row.codeHash))) {
        valid = true;
        await prisma.passwordResetOtp.update({
          where: { id: row.id },
          data: { consumedAt: new Date() },
        });
      }
    }
    if (!valid) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
