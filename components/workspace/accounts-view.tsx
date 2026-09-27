"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CloudCog, ExternalLink, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";

type Account = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  mode: string;
  status: string;
  priority: number;
  quotaLimit: number;
  quotaUsage: number;
  free: number;
  updatedAt: string;
  lastQuotaRefresh: string | null;
  lastError: string | null;
};

type StorageResponse = {
  total: number;
  used: number;
  free: number;
  healthy: number;
  accounts: Account[];
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatTime(value: string | null) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AccountsView() {
  const [storage, setStorage] = useState<StorageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyAccount, setBusyAccount] = useState<string | null>(null);
  const autoSyncStarted = useRef(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    const response = await fetch(force ? "/api/storage?refresh=1" : "/api/storage", { cache: "no-store" });
    if (!response.ok) {
      setMessage("Unable to load connected Google accounts.");
      setLoading(false);
      return;
    }
    setStorage(await response.json() as StorageResponse);
    setLoading(false);
  }, []);

  const syncAccount = useCallback(async (id: string, initial = false) => {
    setBusyAccount(id);
    setMessage(initial ? "Indexing existing Google Drive files…" : "Syncing Google Drive changes…");
    const response = await fetch(`/api/accounts/${encodeURIComponent(id)}/sync${initial ? "?initial=1" : ""}`, { method: "POST" });
    const result = await response.json().catch(() => ({})) as { indexed?: number; changed?: number; removed?: number; error?: string };
    if (response.ok) {
      const processed = result.indexed ?? result.changed ?? 0;
      setMessage(`Drive sync complete. ${processed} item(s) processed${typeof result.removed === "number" ? `, ${result.removed} stale item(s) removed` : ""}.`);
      window.dispatchEvent(new Event("meshly:refresh"));
    } else {
      setMessage(result.error ?? "Drive sync failed.");
    }
    setBusyAccount(null);
    await load(false);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(true); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (autoSyncStarted.current) return;
    const params = new URLSearchParams(window.location.search);
    const syncId = params.get("sync");
    if (!syncId) return;
    autoSyncStarted.current = true;
    params.delete("sync");
    window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`);
    const timer = window.setTimeout(() => { void syncAccount(syncId, true); }, 0);
    return () => window.clearTimeout(timer);
  }, [syncAccount]);

  async function setUploads(id: string, enabled: boolean) {
    setBusyAccount(id);
    const response = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uploadsEnabled: enabled }),
    });
    setMessage(response.ok ? (enabled ? "Uploads enabled." : "Uploads paused.") : "Unable to update this account.");
    setBusyAccount(null);
    await load(false);
  }

  async function disconnect(id: string) {
    if (!window.confirm("Disconnect this Google account? Meshly blocks removal while managed encrypted files still depend on it.")) return;
    setBusyAccount(id);
    const response = await fetch(`/api/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setMessage(response.ok ? "Google account disconnected." : result.message ?? "Unable to disconnect this account.");
    setBusyAccount(null);
    await load(true);
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Google Drives</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Connected Google accounts</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Storage figures are refreshed from Google instead of treated as permanent cached values. Existing Drive files require read access to the whole Drive; Meshly-managed uploads continue to use app-scoped write access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => void load(true)} disabled={loading}><RefreshCw size={16}/>Refresh live data</button>
          <a className="btn" href="/api/auth/google/start"><CloudCog size={16}/>Connect Google</a>
        </div>
      </div>

      {message && <div className="mesh-card mt-5 px-4 py-3 text-sm">{message}</div>}

      {storage && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric label="Combined Google capacity" value={formatBytes(storage.total)} />
          <Metric label="Used across Google" value={formatBytes(storage.used)} />
          <Metric label="Available" value={formatBytes(storage.free)} />
        </div>
      )}

      <div className="mt-5 space-y-4">
        {loading && !storage && <div className="mesh-card p-5 text-sm text-[var(--muted)]">Loading live Google account data…</div>}
        {storage?.accounts.length === 0 && <div className="mesh-card p-5 text-sm text-[var(--muted)]">No Google accounts are connected yet.</div>}
        {storage?.accounts.map((account) => {
          const full = account.mode === "full";
          const healthy = account.status === "healthy";
          const busy = busyAccount === account.id;
          const percent = account.quotaLimit ? Math.min(100, Math.round(account.quotaUsage / account.quotaLimit * 100)) : 0;
          return (
            <article className="mesh-card p-5" key={account.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--blue-soft)] font-semibold">{(account.name || account.email).charAt(0).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{account.name || account.email}</div>
                    <div className="truncate text-sm text-[var(--muted)]">{account.email}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-[var(--surface-strong)] px-2 py-1">{full ? "Existing files enabled" : "Managed files only"}</span>
                      <span className="rounded-full bg-[var(--surface-strong)] px-2 py-1">{account.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {full ? (
                    <button className="btn" disabled={busy} onClick={() => void syncAccount(account.id, false)}><RefreshCw size={15}/>Sync existing files</button>
                  ) : (
                    <a className="btn" href={`/api/auth/google/start?mode=full&accountId=${encodeURIComponent(account.id)}`}><ExternalLink size={15}/>Show existing files</a>
                  )}
                  <button className="btn" disabled={busy} onClick={() => void setUploads(account.id, account.status === "paused")}>{account.status === "paused" ? "Enable uploads" : "Pause uploads"}</button>
                  <button className="btn text-[var(--red)]" disabled={busy} onClick={() => void disconnect(account.id)}><Trash2 size={15}/>Disconnect</button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <div className="flex items-center justify-between gap-4 text-sm"><span>Google account storage</span><b>{formatBytes(account.quotaUsage)} / {formatBytes(account.quotaLimit)}</b></div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--blue)]" style={{ width: `${percent}%` }} /></div>
                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]"><span>{formatBytes(account.free)} free</span><span>Last checked: {formatTime(account.lastQuotaRefresh)}</span></div>
                </div>
                <div className="text-xs text-[var(--muted)]">Priority {account.priority}</div>
              </div>

              {!full && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[var(--surface-strong)] p-4 text-sm leading-6">
                  <ShieldAlert className="mt-0.5 shrink-0 text-[var(--blue)]" size={18}/>
                  <div><b>Your older Google Drive files are not hidden by a Meshly bug in this mode.</b> Google&apos;s narrower app-file permission does not expose arbitrary files that existed before Meshly. Use <b>Show existing files</b> to grant read access for indexing. Google may require additional OAuth verification for this broader permission.</div>
                </div>
              )}

              {full && healthy && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[var(--surface-strong)] p-4 text-sm leading-6">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--blue)]" size={18}/>
                  <div>Existing Drive files can be indexed into Meshly. Meshly&apos;s own new managed uploads remain encrypted and stored with opaque provider object names.</div>
                </div>
              )}

              {account.lastError && <div className="mt-3 text-xs text-[var(--red)]">Last provider error: {account.lastError}</div>}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="mesh-card p-4"><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-2 text-xl font-semibold">{value}</div></div>;
}
