"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, PageHeader, EmptyState, Spinner, selectClass } from "@/components/ui";
import { PickingTable } from "@/components/picking-table";
import { api, opMeta, type PickingRow } from "@/lib/client";

export function OperationsList({ kind }: { kind: keyof typeof opMeta }) {
  const meta = opMeta[kind];
  const [rows, setRows] = useState<PickingRow[] | null>(null);
  const [state, setState] = useState("");

  useEffect(() => {
    const q = new URLSearchParams({ type: meta.type });
    if (state) q.set("state", state);
    api<{ pickings: PickingRow[] }>(`/api/pickings?${q}`).then((d) => setRows(d.pickings));
  }, [meta.type, state]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1280 }}>
      <PageHeader
        title={meta.title}
        subtitle={rows ? `${rows.length} document${rows.length !== 1 ? "s" : ""}` : undefined}
        actions={
          <Link href={`/operations/${kind}/new`}>
            <Button>+ {meta.create}</Button>
          </Link>
        }
      />

      <div
        className="card"
        style={{
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <select
          className={selectClass()}
          style={{ maxWidth: 200 }}
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="">All statuses</option>
          {["draft", "waiting", "ready", "done", "canceled"].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        {state && (
          <button className="btn btn-ghost btn-sm" onClick={() => setState("")}>
            Clear
          </button>
        )}
      </div>

      {!rows ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <EmptyState
            icon="📋"
            title={`No ${meta.title.toLowerCase()} yet`}
            subtitle={`Create your first ${meta.singular.toLowerCase()} to get started.`}
            action={
              <Link href={`/operations/${kind}/new`}>
                <Button size="sm">+ {meta.create}</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <PickingTable
          rows={rows}
          empty={`No ${meta.title.toLowerCase()} yet.`}
          createHref={`/operations/${kind}/new`}
          createLabel={meta.create}
        />
      )}
    </div>
  );
}
