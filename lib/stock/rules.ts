import type { LocationType, PickingType } from "@prisma/client";

export const ON_HAND_TYPES: LocationType[] = ["internal", "production"];

export function isPhysical(type: LocationType): boolean {
  return type === "internal" || type === "production";
}

export function prefixFor(type: PickingType): string {
  switch (type) {
    case "receipt":
      return "IN";
    case "delivery":
      return "OUT";
    case "internal":
      return "INT";
    case "adjustment":
      return "ADJ";
  }
}

export function locationsLegal(
  type: PickingType,
  sourceType: LocationType,
  destType: LocationType,
  sourceId: string,
  destId: string,
): boolean {
  if (sourceId === destId) return false;
  switch (type) {
    case "receipt":
      return sourceType === "supplier" && isPhysical(destType);
    case "delivery":
      return isPhysical(sourceType) && destType === "customer";
    case "internal":
      return isPhysical(sourceType) && isPhysical(destType);
    case "adjustment":
      return (
        (sourceType === "inventory_loss" && isPhysical(destType)) ||
        (isPhysical(sourceType) && destType === "inventory_loss")
      );
  }
}
