"use client";

import { useEffect, useState } from "react";
import { api, type PickingRow } from "@/lib/client";

export default function PrintSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const [picking, setPicking] = useState<PickingRow | null>(null);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    params.then(({ id: value }) => {
      setId(value);
      api<{ picking: PickingRow }>(`/api/pickings/${value}`).then((d) => setPicking(d.picking));
    });
  }, [params]);

  if (!picking) return <p className="text-sm text-gray-500">Loading slip…</p>;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="no-print mb-4">
        <button className="rounded-md bg-[#714B67] px-3 py-1.5 text-sm text-white" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <header className="border-b pb-4">
        <h1 className="text-2xl font-semibold">StockSense — Delivery slip</h1>
        <p className="text-sm text-gray-600">Documents drive stock. The ledger is the audit trail.</p>
      </header>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-gray-500">Reference</dt>
          <dd className="font-medium">{picking.name}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Customer</dt>
          <dd>{picking.partner?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Source</dt>
          <dd>{picking.sourceLocation?.completeName}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Status</dt>
          <dd className="capitalize">{picking.state}</dd>
        </div>
      </dl>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">SKU</th>
            <th className="py-2">Product</th>
            <th className="py-2">From</th>
            <th className="py-2">Qty</th>
          </tr>
        </thead>
        <tbody>
          {(picking.lines ?? []).map((line) => (
            <tr key={line.id ?? `${line.productId}-${line.qty}`} className="border-b">
              <td className="py-2">{line.product?.sku}</td>
              <td className="py-2">{line.product?.name}</td>
              <td className="py-2">{line.sourceLocation?.completeName}</td>
              <td className="py-2">
                {line.qty} {line.product?.uom?.symbol}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-8 text-xs text-gray-500">Slip id {id}. Stock does not change when you print.</p>
    </div>
  );
}
