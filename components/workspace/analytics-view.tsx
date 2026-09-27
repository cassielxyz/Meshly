"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Cloud, Download, Files, Folder, RefreshCw, Share2, ShieldCheck, UploadCloud } from "lucide-react";

type Analytics = {
  files: { total: number; folders: number; bytes: number; managed: number; external: number; ready: number; degraded: number; images: number; archives: number };
  storage: { accounts: number; healthyAccounts: number; total: number; used: number; free: number };
  activity: { total30d: number; uploads30d: number; downloads30d: number; syncs30d: number; warnings30d: number };
  sharing: { active: number; downloads: number };
  generatedAt: string;
  capped: boolean;
};

function fmt(bytes: number) {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${bytes} B`;
}

export function AnalyticsView() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/analytics", { cache: "no-store" });
    if (!response.ok) {
      setError("Unable to load workspace analytics.");
      setLoading(false);
      return;
    }
    setData(await response.json() as Analytics);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  if (loading && !data) return <div className="p-6 text-sm text-[var(--muted)]">Loading analytics…</div>;
  if (error && !data) return <div className="p-6"><div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button className="font-semibold underline" onClick={() => void load()}>Retry</button></div></div>;
  if (!data) return null;

  const storagePercent = data.storage.total ? Math.min(100, Math.round((data.storage.used / data.storage.total) * 100)) : 0;
  const managedPercent = data.files.total ? Math.round((data.files.managed / data.files.total) * 100) : 0;

  return <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Analytics</h1><p className="mt-1 text-sm text-[var(--muted)]">A local Meshly view of indexed files, connected Google capacity, transfers and shares.</p></div>
      <button className="btn" onClick={() => void load()}><RefreshCw size={16}/>Refresh</button>
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Files size={18}/>} label="Files" value={String(data.files.total)} detail={`${data.files.folders} folders`}/>
      <Metric icon={<Cloud size={18}/>} label="Connected Google" value={String(data.storage.accounts)} detail={`${data.storage.healthyAccounts} healthy`}/>
      <Metric icon={<Activity size={18}/>} label="30-day activity" value={String(data.activity.total30d)} detail={`${data.activity.warnings30d} warning-related`}/>
      <Metric icon={<Share2 size={18}/>} label="Active shares" value={String(data.sharing.active)} detail={`${data.sharing.downloads} public downloads`}/>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <section className="mesh-card p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">Google storage</h2><p className="mt-1 text-xs text-[var(--muted)]">Provider-reported capacity across connected Google accounts.</p></div><span className="text-sm font-semibold">{storagePercent}%</span></div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--blue)]" style={{ width: `${storagePercent}%` }}/></div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm"><Stat label="Used" value={fmt(data.storage.used)}/><Stat label="Available" value={fmt(data.storage.free)}/><Stat label="Total" value={fmt(data.storage.total)}/></div>
      </section>

      <section className="mesh-card p-5">
        <h2 className="font-semibold">Indexed workspace</h2><p className="mt-1 text-xs text-[var(--muted)]">Managed Meshly files and explicitly indexed external Google files.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Managed" value={String(data.files.managed)}/><Stat label="External" value={String(data.files.external)}/><Stat label="Images" value={String(data.files.images)}/><Stat label="Archives" value={String(data.files.archives)}/></div>
        <div className="mt-4 text-xs text-[var(--muted)]">{managedPercent}% managed · {fmt(data.files.bytes)} indexed logical file size</div>
      </section>

      <section className="mesh-card p-5">
        <h2 className="font-semibold">Transfers & sync</h2><p className="mt-1 text-xs text-[var(--muted)]">Events recorded during the last 30 days.</p>
        <div className="mt-4 grid grid-cols-2 gap-3"><MetricSmall icon={<UploadCloud size={16}/>} label="Uploads" value={data.activity.uploads30d}/><MetricSmall icon={<Download size={16}/>} label="Downloads" value={data.activity.downloads30d}/><MetricSmall icon={<RefreshCw size={16}/>} label="Sync/index" value={data.activity.syncs30d}/><MetricSmall icon={<ShieldCheck size={16}/>} label="Warnings" value={data.activity.warnings30d}/></div>
      </section>

      <section className="mesh-card p-5">
        <h2 className="font-semibold">Health</h2><p className="mt-1 text-xs text-[var(--muted)]">Logical file state only; provider-specific live verification remains separate.</p>
        <div className="mt-4 grid grid-cols-3 gap-3"><Stat label="Ready" value={String(data.files.ready)}/><Stat label="Needs attention" value={String(data.files.degraded)}/><Stat label="Folders" value={String(data.files.folders)}/></div>
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]"><Folder size={15}/>Generated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generatedAt))}</div>
      </section>
    </div>

    {data.capped && <div className="mt-5 rounded-xl bg-[var(--surface-strong)] px-4 py-3 text-xs text-[var(--muted)]">This dashboard uses bounded queries for responsiveness. Very large workspaces may show an indexed snapshot rather than exhaustive lifetime totals.</div>}
  </div>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="mesh-card p-4"><div className="flex items-center gap-2 text-[var(--muted)]">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div><div className="mt-3 text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-[var(--muted)]">{detail}</div></div>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-1 font-semibold">{value}</div></div>;
}
function MetricSmall({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-xl bg-[var(--surface-strong)] p-3"><div className="flex items-center gap-2 text-xs text-[var(--muted)]">{icon}{label}</div><div className="mt-2 text-xl font-semibold">{value}</div></div>;
}
