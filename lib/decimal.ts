import { Decimal } from "@prisma/client/runtime/library";

export function D(value: Decimal | number | string | null | undefined): Decimal {
  if (value == null) return new Decimal(0);
  return value instanceof Decimal ? value : new Decimal(value);
}

export function num(value: Decimal | number | string | null | undefined): number {
  return D(value).toNumber();
}

export function qtyStr(value: Decimal | number | string | null | undefined): string {
  return D(value).toDecimalPlaces(4).toString();
}
