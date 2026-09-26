import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/http";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return NextResponse.json({ ok: true });
    }
    const demo = process.env.AUTH_DEMO_OTP;
    const code = demo || generateOtp();
    await prisma.passwordResetOtp.create({
      data: {
        email: normalized,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    if (!demo) {
      console.log(`Password reset OTP for ${normalized}: ${code}`);
    }
    return NextResponse.json({
      ok: true,
      hint: demo ? "Use demo OTP 123456" : "If this email exists, an OTP was issued.",
    });
  } catch (error) {
    return handleError(error);
  }
}
