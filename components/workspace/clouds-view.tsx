"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Cloud, ExternalLink, Folder, HardDrive, LockKeyhole, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";

type ProviderAccount = {
  id: string;
  provider: string;
  externalAccountId: string;
  email: string | null;
  name: string | null;
  status: string;
  quotaLimit: number;
  quotaUsage: number;
  free: number;
  updatedAt: string;
  tokenExpiresAt: string | null;
  lastError: string | null;
};

type ProviderSummary = {
  accounts: ProviderAccount[];
  configuration: {
    dropbox: boolean;
    dropboxManagedUploads: boolean;
    terabox: boolean;
    teraboxManagedUploads: boolean;
    teraboxLargeWorker: boolean;
    mega: boolean;
  };
  teraboxAuthorizationUrl: string | null;
};

type BrowserEntry = {
  id: string;
  kind: "file" | "folder";
  name: string;
  path: string;
  size: number;
  modifiedAt: string | null;
};

type BrowserState = {
  accountId: string;
  provider: string;
  path: string;
  entries: BrowserEntry[];
  loading: boolean;
  error: string | null;
} | null;

function fmt(bytes: number) {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function isTeraBoxOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && (url.hostname === "terabox.com" || url.hostname.endsWith(".terabox.com"));
  } catch {
    return false;
  }
}

function extractTeraBoxCode(value: unknown) {
  let payload = value;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch { return null; }
  }
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.event !== "teraboxOauth") return null;
  if (typeof record.code === "string") return record.code;
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (typeof data.code === "string") return data.code;
  }
  return null;
}

export function CloudsView() {
  const [summary, setSummary] = useState<ProviderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [teraBoxOpen, setTeraBoxOpen] = useState(false);
  const [browser, setBrowser] = useState<BrowserState>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    const response = await fetch(force ? "/api/providers?refresh=1" : "/api/providers", { cache: "no-store" });
    if (!response.ok) {
      setMessage("Unable to load cloud providers.");
      setLoading(false);
      return;
    }
    setSummary(await response.json() as ProviderSummary);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(true); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!teraBoxOpen) return;
    const handler = (event: MessageEvent) => {
      if (!isTeraBoxOrigin(event.origin)) return;
      const code = extractTeraBoxCode(event.data);
      if (!code) return;
      setMessage("Connecting TeraBox…");
      void fetch("/api/providers/terabox/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      }).then(async (response) => {
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "TeraBox connection failed");
        setTeraBoxOpen(false);
        setMessage("TeraBox connected.");
        await load(true);
      }).catch((error) => setMessage(error instanceof Error ? error.message : "TeraBox connection failed"));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [teraBoxOpen, load]);

  async function disconnect(id: string) {
    if (!window.confirm("Disconnect this cloud account from Meshly?")) return;
    const response = await fetch(`/api/providers/${encodeURIComponent(id)}`, { method: "DELETE" });
    setMessage(response.ok ? "Cloud account disconnected." : "Unable to disconnect cloud account.");
    if (browser?.accountId === id) setBrowser(null);
    await load(false);
  }

  async function browse(account: ProviderAccount, path?: string) {
    const target = path ?? (account.provider === "dropbox" ? "" : "/");
    setBrowser({ accountId: account.id, provider: account.provider, path: target, entries: [], loading: true, error: null });
    const query = new URLSearchParams({ accountId: account.id });
    if (account.provider === "dropbox") query.set("path", target);
    else query.set("dir", target);
    const response = await fetch(`/api/providers/${account.provider}/files?${query.toString()}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({})) as { entries?: BrowserEntry[]; error?: string };
    setBrowser({
      accountId: account.id,
      provider: account.provider,
      path: target,
      entries: response.ok ? result.entries ?? [] : [],
      loading: false,
      error: response.ok ? null : result.error ?? "Unable to list files",
    });
  }

  const externalAccounts = summary?.accounts ?? [];
  const dropboxAccounts = externalAccounts.filter((account) => account.provider === "dropbox");
  const teraBoxAccounts = externalAccounts.filter((account) => account.provider === "terabox");
  const dropboxWrites = summary?.configuration.dropboxManagedUploads === true;
  const teraBoxWrites = summary?.configuration.teraboxManagedUploads === true;
  const teraBoxLarge = summary?.configuration.teraboxLargeWorker === true;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Other clouds</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Real provider connections, not placeholders.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Dropbox and TeraBox use their official authorization/API flows here. Connection, quota and browsing are separate from managed-upload activation, so Meshly can expose safe read capabilities without claiming unverified write support. MEGA remains disabled until its official SDK can run in a suitable worker.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={loading} onClick={() => void load(true)}><RefreshCw size={16}/>Refresh providers</button>
          <Link href="/drive" className="btn"><Cloud size={16}/>Google Drives</Link>
        </div>
      </div>

      {message && <div className="mesh-card mt-5 px-4 py-3 text-sm">{message}</div>}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ProviderCard
          name="Dropbox"
          state={summary?.configuration.dropbox ? "Official API configured" : "Needs app credentials"}
          description="Full Dropbox connection with live account quota and existing-file browsing. Managed writes use Meshly's encrypted object format and remain independently activation-gated."
          accounts={dropboxAccounts}
          connect={summary?.configuration.dropbox ? <a className="btn" href="/api/auth/dropbox/start"><ExternalLink size={15}/>Connect Dropbox</a> : null}
          onBrowse={(account) => void browse(account)}
          onDisconnect={(id) => void disconnect(id)}
          capabilities={<CapabilityRows rows={[
            ["Connection & browse", summary?.configuration.dropbox === true],
            ["Encrypted managed uploads", dropboxWrites],
          ]}/>} 
        />
        <ProviderCard
          name="TeraBox"
          state={summary?.configuration.terabox ? "Official Open Platform configured" : "Needs Open Platform credentials"}
          description="Official TeraBox authorization, live quota and app-space browsing. Small managed uploads and the dedicated large-file worker have separate fail-closed activation gates."
          accounts={teraBoxAccounts}
          connect={summary?.configuration.terabox && summary.teraboxAuthorizationUrl ? <button className="btn" onClick={() => setTeraBoxOpen(true)}><ExternalLink size={15}/>Connect TeraBox</button> : null}
          onBrowse={(account) => void browse(account)}
          onDisconnect={(id) => void disconnect(id)}
          capabilities={<CapabilityRows rows={[
            ["Connection & browse", summary?.configuration.terabox === true],
            ["Encrypted managed uploads", teraBoxWrites],
            ["Large-file worker", teraBoxLarge],
          ]}/>} 
        />
        <div className="mesh-card p-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--surface-strong)]"><Cloud size={19}/></div><div><h2 className="font-semibold">MEGA</h2><div className="text-xs text-[var(--muted)]">SDK worker required</div></div></div></div>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">MEGA&apos;s supported integration is its SDK. Meshly will not fake a REST adapter or use scraped endpoints; the provider stays visibly unavailable until an SDK-backed worker is deployed and tested.</p>
          <CapabilityRows rows={[["Connection & browse", false], ["Encrypted managed uploads", false]]}/>
        </div>
      </div>

      {browser && (
        <div className="mesh-card mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] p-4">
            <HardDrive size={18}/><div className="min-w-0 flex-1"><div className="font-semibold">{browser.provider === "dropbox" ? "Dropbox" : "TeraBox"} files</div><div className="truncate text-xs text-[var(--muted)]">{browser.path || "/"}</div></div>
            <button className="btn" onClick={() => setBrowser(null)}><X size={15}/>Close</button>
          </div>
          {browser.loading && <div className="p-5 text-sm text-[var(--muted)]">Loading provider files…</div>}
          {browser.error && <div className="p-5 text-sm text-[var(--red)]">{browser.error}</div>}
          {!browser.loading && !browser.error && browser.entries.length === 0 && <div className="p-5 text-sm text-[var(--muted)]">No files returned for this folder.</div>}
          {!browser.loading && !browser.error && browser.entries.map((entry) => {
            const account = externalAccounts.find((item) => item.id === browser.accountId);
            return <button key={entry.id} className="flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--surface)]" onClick={() => entry.kind === "folder" && account ? void browse(account, entry.path) : undefined}>
              {entry.kind === "folder" ? <Folder size={18} className="text-[var(--blue)]"/> : <HardDrive size={18} className="text-[var(--muted)]"/>}
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{entry.name}</div><div className="truncate text-xs text-[var(--muted)]">{entry.path}</div></div>
              <div className="shrink-0 text-xs text-[var(--muted)]">{entry.kind === "folder" ? "Folder" : fmt(entry.size)}</div>
            </button>;
          })}
        </div>
      )}

      <div className="mesh-card mt-6 flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 shrink-0 text-[var(--blue)]" size={19}/>
        <div><div className="font-semibold">Activation rule</div><p className="mt-1 text-sm leading-6 text-[var(--muted)]">A provider is only marked usable for encrypted Meshly uploads after auth, listing, quota, encrypted upload/download, resume, retry, integrity and deletion behavior have passed provider-specific tests. Connection and browsing can become available earlier without claiming upload support.</p></div>
      </div>

      {teraBoxOpen && summary?.teraboxAuthorizationUrl && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Connect TeraBox">
          <div className="w-full max-w-[430px] overflow-hidden rounded-3xl bg-[var(--background)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4"><div><div className="font-semibold">Connect TeraBox</div><div className="text-xs text-[var(--muted)]">Official TeraBox authorization</div></div><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--surface)]" onClick={() => setTeraBoxOpen(false)} aria-label="Close"><X size={18}/></button></div>
            <iframe className="h-[667px] max-h-[72vh] w-full bg-white" src={summary.teraboxAuthorizationUrl} title="TeraBox authorization" referrerPolicy="no-referrer" />
          </div>
        </div>
      )}
    </div>
  );
}

function CapabilityRows({ rows }: { rows: [string, boolean][] }) {
  return <div className="mt-4 space-y-2 rounded-2xl bg-[var(--surface-strong)] p-3">{rows.map(([label, ready]) => <div key={label} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-[var(--muted)]"><LockKeyhole size={13}/>{label}</span><span className={`rounded-full px-2 py-1 font-semibold ${ready ? "bg-green-50 text-green-700" : "bg-[var(--background)] text-[var(--muted)]"}`}>{ready ? "Enabled" : "Locked"}</span></div>)}</div>;
}

function ProviderCard({ name, state, description, accounts, connect, onBrowse, onDisconnect, capabilities }: {
  name: string;
  state: string;
  description: string;
  accounts: ProviderAccount[];
  connect: React.ReactNode;
  onBrowse: (account: ProviderAccount) => void;
  onDisconnect: (id: string) => void;
  capabilities?: React.ReactNode;
}) {
  return <div className="mesh-card p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)]"><Cloud size={19}/></div><div><h2 className="font-semibold">{name}</h2><div className="text-xs text-[var(--muted)]">{state}</div></div></div></div><p className="mt-4 text-sm leading-6 text-[var(--muted)]">{description}</p>{capabilities}{connect && <div className="mt-4">{connect}</div>}<div className="mt-4 space-y-3">{accounts.map((account) => <div key={account.id} className="rounded-2xl border border-[var(--border)] p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-semibold">{account.name || account.email || account.externalAccountId}</div><div className="truncate text-xs text-[var(--muted)]">{account.email || account.status}</div></div><span className="rounded-full bg-[var(--surface-strong)] px-2 py-1 text-[10px] font-semibold">{account.status}</span></div><div className="mt-3 text-xs text-[var(--muted)]">{fmt(account.quotaUsage)} used · {fmt(account.free)} free</div><div className="mt-3 flex gap-2"><button className="btn" onClick={() => onBrowse(account)}><Folder size={14}/>Browse</button><button className="btn text-[var(--red)]" onClick={() => onDisconnect(account.id)}><Trash2 size={14}/>Disconnect</button></div>{account.lastError && <div className="mt-2 text-xs text-[var(--red)]">{account.lastError}</div>}</div>)}{accounts.length === 0 && <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-xs text-[var(--muted)]">No connected {name} account.</div>}</div></div>;
}
