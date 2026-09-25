"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, CloudCog, ExternalLink, HardDrive, RefreshCw, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { workspaceSections } from "@/lib/navigation";

type Section = (typeof workspaceSections)[number];
type Account = {
  id: string;
  email: string;
  name: string | null;
  mode: string;
  status: string;
  priority: number;
  quotaLimit: number;
  quotaUsage: number;
  free: number;
  lastQuotaRefresh?: string | null;
  lastRecoverySnapshot?: string | null;
  lastError?: string | null;
};
type Storage = { total: number; used: number; free: number; healthy: number; accounts: Account[] };
type Act = { id: string; kind: string; subjectId: string | null; metadata: Record<string, unknown>; createdAt: string };
type Share = { id: string; fileId: string; name: string; protected: boolean; expiresAt: string | null; maxDownloads: number | null; downloadCount: number; revokedAt: string | null; createdAt: string };
type Integrity = { files: { id: string; name: string; size: number; status: string; sha256: string | null; updatedAt: string }[]; degraded: number };
type Recovery = { accounts: { id: string; email: string; status: string; lastRecoverySnapshot: string | null; lastError: string | null }[] };
type Me = { user: { id: string; email: string; name: string | null; avatarUrl: string | null }; accountCount: number; fileCount: number };

function fmt(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${n} B`;
}
function date(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}
function endpointFor(section: Section) {
  if (section === "storage" || section === "accounts") return "/api/storage";
  if (section === "shared") return "/api/shares";
  if (section === "activity" || section === "transfers" || section === "notifications") return "/api/activity";
  if (section === "integrity") return "/api/integrity";
  if (section === "recovery") return "/api/recovery";
  if (section === "diagnostics") return "/api/health";
  if (section === "profile") return "/api/me";
  return null;
}

export function SectionView({ section }: { section: Section }) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const endpoint = endpointFor(section);

  const load = useCallback(async () => {
    if (!endpoint) return;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (response.ok) {
      setData(await response.json());
      setMessage("");
    } else {
      setMessage("Unable to load this page.");
    }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    if (endpoint) void load();
  }, [endpoint, load]);

  async function refreshAccounts() {
    setMessage("Refreshing Google storage quotas…");
    const response = await fetch("/api/accounts", { method: "POST" });
    setMessage(response.ok ? "Storage quotas refreshed." : "Some accounts could not be refreshed.");
    await load();
  }
  async function accountPatch(id: string, enabled: boolean) {
    await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uploadsEnabled: enabled }),
    });
    await load();
  }
  async function disconnect(id: string) {
    if (!confirm("Disconnect this account? Meshly blocks removal while stored chunks still depend on it.")) return;
    const response = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      alert(result.message ?? "This account is still in use.");
    }
    await load();
  }
  async function scan() {
    setMessage("Verifying physical chunks…");
    const response = await fetch("/api/integrity", { method: "POST" });
    const result = (await response.json().catch(() => ({}))) as { checked?: number; degraded?: number };
    setMessage(response.ok ? `Checked ${result.checked ?? 0} chunks. ${result.degraded ?? 0} degraded files found.` : "Integrity scan failed.");
    await load();
  }
  async function snapshot() {
    setMessage("Writing recovery manifests to connected accounts…");
    const response = await fetch("/api/recovery", { method: "POST" });
    const result = (await response.json().catch(() => ({}))) as { written?: number; failures?: string[] };
    setMessage(response.ok ? `Recovery snapshot written to ${result.written ?? 0} account(s).` : `Snapshot failed: ${(result.failures ?? []).join(", ")}`);
    await load();
  }
  async function restore() {
    if (!confirm("Restore the Meshly logical index from the newest valid recovery manifest? Existing matching item IDs will be reconciled.")) return;
    setMessage("Finding and verifying recovery manifests…");
    const response = await fetch("/api/recovery/restore", { method: "POST" });
    const result = (await response.json().catch(() => ({}))) as { restoredFiles?: number; restoredChunks?: number; error?: string };
    setMessage(response.ok ? `Restored ${result.restoredFiles ?? 0} items and ${result.restoredChunks ?? 0} chunk records.` : result.error ?? "Restore failed.");
    await load();
  }
  async function revoke(id: string) {
    await fetch(`/api/shares?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  if (section === "help") return <StaticPage title="Help center"><p>Meshly combines Google storage accounts behind one logical filesystem. Use <b>New</b> to create folders, upload files or folders, or connect another account. Large files are split only when needed, verified, and reconstructed automatically on download.</p><p>If an account becomes unavailable, open <Link className="text-[var(--blue)]" href="/accounts">Accounts</Link>. For file health, run <Link className="text-[var(--blue)]" href="/integrity">Integrity</Link>. For disaster recovery, use <Link className="text-[var(--blue)]" href="/recovery">Recovery</Link>.</p></StaticPage>;
  if (section === "privacy") return <StaticPage title="Privacy"><p>Meshly stores logical file metadata and encrypted Google refresh tokens in its database. File bytes upload directly to Google Drive resumable sessions and are not intentionally buffered on the Meshly application server.</p><p>Recovery manifests contain filesystem and chunk metadata but never refresh tokens. Disconnecting an account is blocked while Meshly files still depend on it.</p></StaticPage>;
  if (loading) return <Page title={section}>Loading…</Page>;

  if (section === "storage" && data) {
    const storage = data as Storage;
    const pct = storage.total ? Math.round((storage.used / storage.total) * 100) : 0;
    return <Page title="Storage pool" action={<button onClick={() => void refreshAccounts()} className="btn"><RefreshCw size={16}/>Refresh quotas</button>} message={message}>
      <div className="grid gap-4 md:grid-cols-3"><Metric label="Combined capacity" value={fmt(storage.total)}/><Metric label="Used across Google" value={fmt(storage.used)}/><Metric label="Available" value={fmt(storage.free)}/></div>
      <div className="mesh-card mt-5 p-5"><div className="flex justify-between text-sm"><span>Pool usage</span><b>{pct}%</b></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--blue)]" style={{ width: `${pct}%` }}/></div></div>
      <AccountCards accounts={storage.accounts}/>
    </Page>;
  }

  if (section === "accounts" && data) {
    const storage = data as Storage;
    return <Page title="Connected accounts" action={<div className="flex gap-2"><button onClick={() => void refreshAccounts()} className="btn"><RefreshCw size={16}/>Refresh</button><a href="/api/auth/google/start?link=1" className="btn"><CloudCog size={16}/>Connect Google</a></div>} message={message}>
      <div className="space-y-3">{storage.accounts.map((account) => <div className="mesh-card flex flex-wrap items-center gap-4 p-4" key={account.id}><div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--blue-soft)] font-semibold">{account.email[0]?.toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate font-medium">{account.email}</div><div className="text-xs text-[var(--muted)]">{account.mode} · {account.status} · {fmt(account.quotaUsage)} / {fmt(account.quotaLimit)}</div></div><button className="btn" onClick={() => void accountPatch(account.id, account.status === "paused")}>{account.status === "paused" ? "Enable uploads" : "Pause uploads"}</button><button className="btn text-[var(--red)]" onClick={() => void disconnect(account.id)}><Trash2 size={15}/>Disconnect</button></div>)}</div>
    </Page>;
  }

  if (section === "shared" && data) {
    const rows = (data as { shares: Share[] }).shares;
    return <Page title="Shared links"><div className="space-y-3">{rows.length === 0 && <Empty text="No share links yet. Create one from a file action menu."/>}{rows.map((share) => <div className="mesh-card flex flex-wrap items-center gap-4 p-4" key={share.id}><ExternalLink size={19}/><div className="min-w-0 flex-1"><div className="truncate font-medium">{share.name}</div><div className="text-xs text-[var(--muted)]">{share.protected ? "Password protected · " : ""}{share.downloadCount}{share.maxDownloads ? ` / ${share.maxDownloads}` : ""} downloads · expires {date(share.expiresAt)}</div></div><span className={`rounded-full px-2 py-1 text-xs ${share.revokedAt ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{share.revokedAt ? "Revoked" : "Active"}</span>{!share.revokedAt && <button onClick={() => void revoke(share.id)} className="btn">Revoke</button>}</div>)}</div></Page>;
  }

  if ((section === "activity" || section === "transfers" || section === "notifications") && data) {
    let rows = (data as { activities: Act[] }).activities;
    if (section === "transfers") rows = rows.filter((item) => item.kind.includes("upload") || item.kind.includes("download"));
    if (section === "notifications") rows = rows.filter((item) => /integrity|recovery|upload|error|failed/.test(item.kind));
    const title = section === "transfers" ? "Transfer center" : section === "notifications" ? "Notifications" : "Activity";
    return <Page title={title}><div className="mesh-card divide-y divide-[var(--border)]">{rows.length === 0 && <Empty text="No events yet."/>}{rows.map((item) => <div key={item.id} className="flex items-start gap-3 p-4"><Activity size={17} className="mt-0.5 text-[var(--blue)]"/><div><div className="text-sm font-medium">{item.kind.replaceAll("_", " ")}</div><div className="mt-1 text-xs text-[var(--muted)]">{date(item.createdAt)}</div></div></div>)}</div></Page>;
  }

  if (section === "integrity" && data) {
    const integrity = data as Integrity;
    return <Page title="Integrity" action={<button className="btn" onClick={() => void scan()}><ShieldCheck size={16}/>Run verification</button>} message={message}><div className="grid gap-4 sm:grid-cols-2"><Metric label="Indexed files" value={String(integrity.files.length)}/><Metric label="Degraded" value={String(integrity.degraded)}/></div><div className="mesh-card mt-5 divide-y divide-[var(--border)]">{integrity.files.slice(0, 50).map((file) => <div className="flex items-center justify-between gap-3 p-4" key={file.id}><div className="min-w-0"><div className="truncate text-sm font-medium">{file.name}</div><div className="text-xs text-[var(--muted)]">{fmt(file.size)}</div></div><span className={`rounded-full px-2 py-1 text-xs ${file.status === "ready" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{file.status}</span></div>)}</div></Page>;
  }

  if (section === "recovery" && data) {
    const recovery = data as Recovery;
    const accounts = recovery.accounts.map((account) => ({ ...account, name: null, mode: "", priority: 0, quotaLimit: 0, quotaUsage: 0, free: 0 }));
    return <Page title="Recovery" action={<div className="flex gap-2"><button onClick={() => void snapshot()} className="btn"><UploadCloud size={16}/>Write snapshot</button><button onClick={() => void restore()} className="btn"><RefreshCw size={16}/>Restore index</button></div>} message={message}><p className="mb-5 max-w-3xl text-sm text-[var(--muted)]">A signed filesystem manifest is copied into the hidden application-data area of each healthy Google account. Meshly can use the newest valid copy to rebuild logical metadata after database loss.</p><AccountCards accounts={accounts}/></Page>;
  }

  if (section === "diagnostics" && data) {
    const health = data as { ok: boolean; service: string; time: string; oauthConfigured: boolean; databaseConfigured: boolean };
    return <Page title="Diagnostics"><div className="grid gap-4 sm:grid-cols-2"><Metric label="Web service" value={health.ok ? "Operational" : "Problem"}/><Metric label="Database configured" value={health.databaseConfigured ? "Yes" : "No"}/><Metric label="Google OAuth configured" value={health.oauthConfigured ? "Yes" : "No"}/><Metric label="Checked" value={date(health.time)}/></div></Page>;
  }

  if (section === "profile" && data) {
    const me = data as Me;
    return <Page title="Profile"><div className="mesh-card max-w-2xl p-6"><div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#4285f4] to-[#34a853] text-xl font-bold text-white">{(me.user.name ?? me.user.email)[0]?.toUpperCase()}</div><h2 className="mt-4 text-xl font-semibold">{me.user.name ?? "Meshly user"}</h2><p className="text-sm text-[var(--muted)]">{me.user.email}</p><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Connected accounts" value={String(me.accountCount)}/><Metric label="Indexed items" value={String(me.fileCount)}/></div><form action="/api/auth/logout" method="post"><button className="btn mt-5">Sign out</button></form></div></Page>;
  }

  return <Page title={section} message={message}><Empty text="This workspace is ready."/></Page>;
}

function Page({ title, children, action, message }: { title: string; children?: React.ReactNode; action?: React.ReactNode; message?: string }) {
  return <div className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl p-4 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold capitalize">{title}</h1>{action}</div>{message && <div className="mt-4 rounded-xl bg-[var(--blue-soft)] px-4 py-3 text-sm">{message}</div>}<div className="mt-6">{children}</div></div>;
}
function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <Page title={title}><div className="mesh-card max-w-3xl space-y-4 p-6 text-sm leading-7">{children}</div></Page>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="mesh-card p-5"><div className="text-xs font-medium text-[var(--muted)]">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-[var(--muted)]">{text}</div>;
}
function AccountCards({ accounts }: { accounts: Account[] }) {
  return <div className="mt-5 grid gap-3 md:grid-cols-2">{accounts.map((account) => {const pct = account.quotaLimit ? Math.round((account.quotaUsage / account.quotaLimit) * 100) : 0; return <div className="mesh-card p-4" key={account.id}><div className="flex items-center gap-3"><HardDrive size={18}/><div className="min-w-0"><div className="truncate text-sm font-medium">{account.email}</div><div className="text-xs text-[var(--muted)]">{account.status}</div></div></div>{account.quotaLimit > 0 && <><div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--blue)]" style={{ width: `${pct}%` }}/></div><div className="mt-2 text-xs text-[var(--muted)]">{fmt(account.quotaUsage)} / {fmt(account.quotaLimit)} · {fmt(account.free)} free</div></>}{account.lastRecoverySnapshot && <div className="mt-2 text-xs text-[var(--muted)]">Recovery: {date(account.lastRecoverySnapshot)}</div>}{account.lastError && <div className="mt-2 text-xs text-[var(--red)]">{account.lastError}</div>}</div>;})}</div>;
}
