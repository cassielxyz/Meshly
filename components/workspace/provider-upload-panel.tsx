"use client";

import { useEffect, useRef, useState } from "react";
import { CloudUpload, LockKeyhole, ShieldCheck } from "lucide-react";
import { uploadMeshlyDropboxFile, type ProviderUploadProgress } from "@/lib/client/provider-upload";
import { uploadMeshlyTeraBoxFile } from "@/lib/client/terabox-upload";

type ProviderAccount = {
  id: string;
  provider: "dropbox" | "terabox" | string;
  externalAccountId: string;
  email: string | null;
  name: string | null;
  status: string;
};

type ProviderSummary = {
  accounts: ProviderAccount[];
  configuration: {
    dropboxManagedUploads?: boolean;
    teraboxManagedUploads?: boolean;
  };
};

type Target = { accountId: string; provider: "dropbox" | "terabox"; label: string };

type TransferState = {
  provider: string;
  name: string;
  phase: string;
  percent: number;
  error?: string;
} | null;

function phaseLabel(value: ProviderUploadProgress["phase"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ProviderUploadPanel() {
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<Target | null>(null);
  const [summary, setSummary] = useState<ProviderSummary | null>(null);
  const [transfer, setTransfer] = useState<TransferState>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/providers", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<ProviderSummary> : null)
      .then((value) => {
        if (!cancelled && value) setSummary(value);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const accounts = (summary?.accounts ?? []).filter((account): account is ProviderAccount & { provider: "dropbox" | "terabox" } =>
    account.status === "healthy" && (account.provider === "dropbox" || account.provider === "terabox"),
  );
  const activeAccounts = accounts.filter((account) =>
    account.provider === "dropbox"
      ? summary?.configuration.dropboxManagedUploads === true
      : summary?.configuration.teraboxManagedUploads === true,
  );
  const hasConnectedProvider = accounts.length > 0;

  function choose(account: ProviderAccount & { provider: "dropbox" | "terabox" }) {
    target.current = {
      accountId: account.id,
      provider: account.provider,
      label: account.name || account.email || account.externalAccountId,
    };
    input.current?.click();
  }

  async function upload(file?: File) {
    const selected = target.current;
    if (!file || !selected) return;
    const providerName = selected.provider === "dropbox" ? "Dropbox" : "TeraBox";
    const progress = (value: ProviderUploadProgress) => setTransfer({
      provider: providerName,
      name: file.name,
      phase: phaseLabel(value.phase),
      percent: value.percent,
    });

    setTransfer({ provider: providerName, name: file.name, phase: "Planning", percent: 0 });
    try {
      if (selected.provider === "dropbox") {
        await uploadMeshlyDropboxFile(file, selected.accountId, progress);
      } else {
        await uploadMeshlyTeraBoxFile(file, selected.accountId, progress);
      }
      setTransfer({ provider: providerName, name: file.name, phase: "Encrypted and verified", percent: 100 });
      window.dispatchEvent(new Event("meshly:refresh"));
      window.setTimeout(() => setTransfer(null), 2200);
    } catch (error) {
      setTransfer({
        provider: providerName,
        name: file.name,
        phase: "Upload failed",
        percent: 0,
        error: error instanceof Error ? error.message : "Provider upload failed",
      });
    } finally {
      target.current = null;
    }
  }

  if (!summary || (!hasConnectedProvider && activeAccounts.length === 0)) return null;

  return (
    <section className="mx-auto mt-6 w-full max-w-6xl px-4 pb-2 sm:px-6 lg:px-8" aria-label="Encrypted provider uploads">
      <input
        ref={input}
        className="hidden"
        type="file"
        onChange={(event) => {
          void upload(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <div className="mesh-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold"><LockKeyhole size={18} className="text-[var(--blue)]"/>Encrypted managed uploads</div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Provider upload controls only appear after that provider's production safety gate is enabled. Until then, connection, live quota and browsing stay usable without pretending encrypted writes are verified.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold">
            <ShieldCheck size={15}/>{activeAccounts.length ? `${activeAccounts.length} upload destination${activeAccounts.length === 1 ? "" : "s"}` : "Transfer gates locked"}
          </div>
        </div>

        {activeAccounts.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {activeAccounts.map((account) => (
              <button key={account.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-4 text-left transition hover:bg-[var(--surface)]" onClick={() => choose(account)}>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)]"><CloudUpload size={19}/></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">Upload encrypted file to {account.provider === "dropbox" ? "Dropbox" : "TeraBox"}</div>
                  <div className="truncate text-xs text-[var(--muted)]">{account.name || account.email || account.externalAccountId}</div>
                  {account.provider === "terabox" && <div className="mt-1 text-[11px] text-[var(--muted)]">Current serverless path: small files only; large-file worker remains gated.</div>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
            Connected provider accounts are available for quota and browsing, but encrypted managed uploads remain locked until their provider-specific live verification passes.
          </div>
        )}

        {transfer && (
          <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-medium">{transfer.name}</span><span className="text-[var(--muted)]">{transfer.provider} · {transfer.phase} · {transfer.percent}%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--blue)] transition-[width]" style={{ width: `${Math.max(0, Math.min(100, transfer.percent))}%` }}/></div>
            {transfer.error && <div className="mt-2 text-xs text-[var(--red)]">{transfer.error}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
