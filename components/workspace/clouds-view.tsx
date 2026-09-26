import Link from "next/link";
import { Cloud, Gauge, LockKeyhole, ShieldCheck, TimerReset, UploadCloud } from "lucide-react";
import { storageProviders } from "@/lib/storage/providers";

const maturityLabel = {
  active: "Active",
  planned: "Adapter planned",
  experimental: "API verification",
} as const;

export function CloudsView() {
  const providers = storageProviders.filter((provider) => provider.section === "other");
  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Other clouds</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">More providers, one Meshly workspace.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            TeraBox, Dropbox, MEGA and future adapters live here, separate from Google Drives. Every adapter must use the shared Meshly transfer policy and mandatory encrypted storage format before it can be enabled for real files.
          </p>
        </div>
        <Link href="/drive" className="btn w-fit"><Cloud size={16}/>Open Google Drives</Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => (
          <article className="mesh-card p-5" key={provider.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)]"><Cloud size={21}/></div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{provider.name}</h2>
                  <div className="mt-1 text-xs text-[var(--muted)]">{maturityLabel[provider.maturity]}</div>
                </div>
              </div>
              <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold">{provider.id}</span>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{provider.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Capability icon={<UploadCloud size={16}/>} label="Active uploads" value={String(provider.transfer.maxActiveUploads)}/>
              <Capability icon={<TimerReset size={16}/>} label="Resumable" value={provider.transfer.resumable ? "Yes" : "Pending"}/>
              <Capability icon={<Gauge size={16}/>} label="Concurrency" value={provider.transfer.adaptiveConcurrency ? "Adaptive" : "Fixed / safe"}/>
              <Capability icon={<LockKeyhole size={16}/>} label="Cloud objects" value="Encrypted only"/>
            </div>

            {provider.id === "terabox" && (
              <div className="mt-4 rounded-2xl bg-[var(--surface-strong)] p-4 text-xs leading-5 text-[var(--muted)]">
                TeraBox starts conservatively at one active file and one upload part at a time. Hashing and encryption can prepare later files while the remote queue stays sequential.
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="mesh-card mt-5 flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 shrink-0 text-[var(--blue)]" size={19}/>
        <div>
          <div className="font-semibold">Provider activation gate</div>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">No new cloud adapter should become active until authentication, provider limits, resumable behavior, encrypted-object compatibility, integrity verification and retry/throttling behavior are covered by tests.</p>
        </div>
      </div>
    </div>
  );
}

function Capability({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-[var(--border)] p-3"><div className="flex items-center gap-2 text-xs text-[var(--muted)]">{icon}{label}</div><div className="mt-2 text-sm font-semibold">{value}</div></div>;
}
