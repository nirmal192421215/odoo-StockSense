import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { StockError } from "@/lib/stock/errors";

export function handleError(error: unknown) {
  if (error instanceof Response) {
    return new NextResponse(error.statusText, { status: error.status });
  }
  if (error instanceof StockError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "SKU already exists." }, { status: 400 });
    }
  }
  console.error(error);
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}

export async function readJson<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}
