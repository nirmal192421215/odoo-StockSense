export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

export const Messages = {
  empty: "Cannot validate an empty document.",
  doneCancel: "Done documents cannot be canceled. Create a reverse document.",
  sku: "SKU already exists.",
  qty: "Quantity must be greater than zero.",
  reason: "Adjustment requires a reason.",
  pickPack: "Delivery must be picked and packed before validate.",
  staffDelete: "Staff cannot delete products or warehouses.",
  locations: "Locations are not valid for this operation type.",
  insufficient: (sku: string, location: string, have: string, need: string) =>
    `Insufficient quantity for ${sku} at ${location} (have ${have}, need ${need}).`,
};

export function insufficient(
  sku: string,
  location: string,
  have: string | number,
  need: string | number,
) {
  return new StockError(Messages.insufficient(sku, location, String(have), String(need)));
}
