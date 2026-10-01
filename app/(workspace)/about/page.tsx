import Link from "next/link";
import { MeshlyLogo } from "@/components/brand/meshly-logo";

export default function AboutPage() {
  return <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
    <div className="mesh-card p-6 sm:p-8">
      <MeshlyLogo />
      <h1 className="mt-6 text-3xl font-semibold">One organized workspace across your clouds.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">Meshly is a unified cloud-storage workspace built around a logical filesystem, encrypted managed files, provider-aware transfers, integrity checks, recovery and secure sharing. Google remains the primary managed-storage path, while additional providers are enabled only when their official integration path has been implemented and live-verified.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><Fact label="Managed files" value="Encryption v1"/><Fact label="Google placement" value="Whole file only"/><Fact label="Provider gates" value="Fail closed"/></div>
      <div className="mt-6 flex flex-wrap gap-3"><Link href="/drive" className="btn">Open workspace</Link><Link href="/help" className="btn">Help center</Link><Link href="/privacy" className="btn">Privacy</Link><Link href="/terms" className="btn">Terms</Link></div>
    </div>
  </div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-[var(--surface-strong)] p-4"><div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</div><div className="mt-2 font-semibold">{value}</div></div>;
}
