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
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = new URLSearchParams({ type: meta.type });
    if (state) q.set("state", state);
    api<{ pickings: PickingRow[] }>(`/api/pickings?${q}`).then((d) => setRows(d.pickings));
  }, [meta.type, state]);

  const filteredRows = rows ? rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const matchName = r.name.toLowerCase().includes(q);
    const matchPartner = r.partner?.name?.toLowerCase().includes(q);
    const matchDest = r.destLocation?.completeName?.toLowerCase().includes(q);
    const matchSrc = r.sourceLocation?.completeName?.toLowerCase().includes(q);
    return matchName || matchPartner || matchDest || matchSrc;
  }) : null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1280 }}>
      <PageHeader
        title={meta.title}
        subtitle={rows ? `${rows.length} document${rows.length !== 1 ? "s" : ""}` : undefined}
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link
              href={`/operations/kanban?type=${meta.type}`}
              className="btn btn-secondary btn-sm"
              title="Switch to Kanban board"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span>🗂️</span> Kanban View
            </Link>
            <Link href={`/operations/${kind}/new`}>
              <Button>+ {meta.create}</Button>
            </Link>
          </div>
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
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
          <input
            type="text"
            placeholder="Search reference, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input text-sm"
            style={{ width: "100%", paddingLeft: 30 }}
          />
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.8rem",
              opacity: 0.6,
            }}
          >
            🔍
          </span>
        </div>

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
        {(state || search) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setState("");
              setSearch("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      {!filteredRows ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <Spinner />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <EmptyState
            icon="📋"
            title={rows && rows.length > 0 ? "No matching operations" : `No ${meta.title.toLowerCase()} yet`}
            subtitle={rows && rows.length > 0 ? "Try adjusting your search or status filter." : `Create your first ${meta.singular.toLowerCase()} to get started.`}
            action={
              rows && rows.length > 0 ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setState("");
                    setSearch("");
                  }}
                >
                  Reset Filters
                </button>
              ) : (
                <Link href={`/operations/${kind}/new`}>
                  <Button size="sm">+ {meta.create}</Button>
                </Link>
              )
            }
          />
        </div>
      ) : (
        <PickingTable
          rows={filteredRows}
          empty={`No ${meta.title.toLowerCase()} yet.`}
          createHref={`/operations/${kind}/new`}
          createLabel={meta.create}
        />
      )}
    </div>
  );
}
