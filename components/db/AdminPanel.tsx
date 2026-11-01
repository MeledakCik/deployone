"use client";
import { useCallback, useEffect, useState } from "react";
import BrowseTab from "./BrowseTab";
import ImportExportTab from "./ImportExportTab";
import SqlTab from "./SqlTab";
import StructureTab from "./StructureTab";
import TablesTab from "./TablesTab";
import type { Schema } from "./types";
import { Notice, api, cx, surface } from "./ui";

const TABS = [
  ["tables", "Tables"],
  ["browse", "Browse"],
  ["structure", "Structure"],
  ["sql", "SQL"],
  ["io", "Import/Export"],
] as const;
type TabKey = (typeof TABS)[number][0];

/** Panel admin ala phpMyAdmin — komponen yang sama dipakai di dashboard dan di /db/<id>. */
export default function AdminPanel({ id }: { id: string }) {
  const [tab, setTab] = useState<TabKey>("tables");
  const [schema, setSchema] = useState<Schema | null>(null);
  const [table, setTable] = useState("");
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      const s = await api<Schema>(`/api/databases/${id}/schema`);
      setSchema(s);
      setErr("");
      setTable((cur) => (s.tables.some((t) => t.name === cur) ? cur : s.tables[0]?.name ?? ""));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className={`${surface} overflow-hidden`}>
      <div role="tablist" className="flex snap-x gap-1 overflow-x-auto bg-[var(--pill-bg)] px-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            type="button"
            onClick={() => setTab(k)}
            className={cx(
              "shrink-0 snap-start whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]",
              tab === k ? "bg-[var(--surface-solid)] text-lav-text   " : "text-text-muted hover:bg-[var(--card-hover)] hover:text-text  "
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-3 sm:p-5">
        {err && <Notice kind="error">{err}</Notice>}
        {!schema && !err && <div className="space-y-2" aria-busy="true"><div className="h-8 w-40 animate-pulse rounded-lg bg-tone-lilac" /><div className="h-32 animate-pulse rounded-xl bg-tone-lilac" /></div>}
        {schema && tab === "tables" && <TablesTab schema={schema} onOpen={(t, to) => { setTable(t); setTab(to); }} onReload={reload} />}
        {schema && tab === "browse" && <BrowseTab id={id} schema={schema} table={table} setTable={setTable} onChanged={reload} />}
        {schema && tab === "structure" && <StructureTab id={id} schema={schema} table={table} setTable={setTable} onChanged={reload} />}
        {schema && tab === "sql" && <SqlTab id={id} onChanged={reload} />}
        {schema && tab === "io" && <ImportExportTab id={id} schema={schema} onChanged={reload} />}
      </div>
    </div>
  );
}
