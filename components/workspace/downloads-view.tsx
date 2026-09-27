"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

type ActivityRow = {
  id: string;
  kind: string;
  subjectId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function fmtSize(value: unknown) {
  const bytes = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function DownloadsView() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/activity", { cache: "no-store" });
    if (!response.ok) {
      setError("Unable to load download history.");
      setLoading(false);
      return;
    }
    const data = await response.json() as { activities: ActivityRow[] };
    setRows(data.activities.filter((item) => item.kind.includes("download")));
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  return <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Downloads</h1><p className="mt-1 text-sm text-[var(--muted)]">Authenticated Meshly download requests from this workspace.</p></div><button className="btn" onClick={() => void load()}><RefreshCw size={16}/>Refresh</button></div>
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {loading && <div className="mt-10 text-center text-sm text-[var(--muted)]">Loading download history…</div>}
    {!loading && rows.length === 0 && <div className="mesh-card mt-6 p-8 text-center"><Download className="mx-auto text-[var(--muted)]" size={36}/><h2 className="mt-3 font-medium">No recorded downloads yet</h2><p className="mt-1 text-sm text-[var(--muted)]">New downloads will appear here. Older downloads made before activity tracking was added are not backfilled.</p></div>}
    {!loading && rows.length > 0 && <div className="mesh-card mt-6 divide-y divide-[var(--border)]">{rows.map((row) => {
      const name = typeof row.metadata.name === "string" ? row.metadata.name : "Meshly file";
      const ranged = row.metadata.ranged === true;
      return <div key={row.id} className="flex flex-wrap items-center gap-4 p-4"><div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--blue-soft)] text-[var(--blue)]"><Download size={18}/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{name}</div><div className="mt-1 text-xs text-[var(--muted)]">{fmtSize(row.metadata.size)} · {ranged ? "Range request" : "Full download request"} · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))}</div></div>{row.subjectId && <a className="btn" href={`/api/files/${row.subjectId}/download`}>Download again</a>}</div>;
    })}</div>}
  </div>;
}
