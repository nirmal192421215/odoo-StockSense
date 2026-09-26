"use client";

import Link from "next/link";
import { StatusPill } from "@/components/ui";
import type { PickingRow } from "@/lib/client";
import { opPath } from "@/lib/client";

export function PickingTable({
  rows,
  empty: _empty,
  createHref: _createHref,
  createLabel: _createLabel,
}: {
  rows: PickingRow[];
  empty: string;
  createHref: string;
  createLabel: string;
}) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Status</th>
              <th>Partner</th>
              <th>From</th>
              <th>To</th>
              <th>WH</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link
                    href={`/operations/${opPath(row.type)}/${row.id}`}
                    className="link-brand"
                    style={{ fontWeight: 600 }}
                  >
                    {row.name}
                  </Link>
                </td>
                <td><StatusPill state={row.state} /></td>
                <td style={{ color: "var(--ink-muted)", fontSize: "0.8125rem" }}>
                  {row.partner?.name ?? <span style={{ color: "var(--ink-faint)" }}>—</span>}
                </td>
                <td style={{ color: "var(--ink-muted)", fontSize: "0.8125rem" }}>
                  {row.sourceLocation?.completeName ?? "—"}
                </td>
                <td style={{ color: "var(--ink-muted)", fontSize: "0.8125rem" }}>
                  {row.destLocation?.completeName ?? "—"}
                </td>
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--brand-light)",
                      color: "var(--brand)",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {row.warehouse?.code ?? "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
