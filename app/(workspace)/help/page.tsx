import Link from "next/link";
import { Cloud, HardDrive, LockKeyhole, ShieldCheck } from "lucide-react";

export default function HelpPage() {
  return <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
    <div><h1 className="text-2xl font-semibold">Help center</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Meshly gives you one logical workspace across connected storage while keeping provider rules explicit. Google-managed uploads are encrypted and stored whole in a single healthy Google account; Meshly does not split one Google file across multiple accounts.</p></div>

    <div className="mt-7 grid gap-4 md:grid-cols-2">
      <Card icon={<HardDrive size={19}/>} title="Files & folders"><p>Create folders, upload files or folders, search, sort, filter, star, move, trash, restore, preview, download, share and inspect file details from the Drive workspace.</p><Link className="mt-3 inline-flex font-semibold text-[var(--blue)]" href="/drive">Open Drive</Link></Card>
      <Card icon={<Cloud size={19}/>} title="Google accounts"><p>Managed mode uses the narrower Google Drive permission for Meshly-created files. Optional Full Drive mode can index existing files after explicit broader read consent and any required production verification.</p><Link className="mt-3 inline-flex font-semibold text-[var(--blue)]" href="/accounts">Manage accounts</Link></Card>
      <Card icon={<LockKeyhole size={19}/>} title="Managed-file encryption"><p>New Meshly-managed files use encryption v1 before cloud storage. The current design is backend-trusted; it is not described as zero-knowledge encryption.</p><Link className="mt-3 inline-flex font-semibold text-[var(--blue)]" href="/settings/security">Security settings</Link></Card>
      <Card icon={<ShieldCheck size={19}/>} title="Integrity & recovery"><p>Run integrity verification when a file or provider looks unhealthy. Recovery snapshots rebuild the logical index from signed metadata without storing plaintext file keys or provider credentials.</p><div className="mt-3 flex gap-4"><Link className="font-semibold text-[var(--blue)]" href="/integrity">Integrity</Link><Link className="font-semibold text-[var(--blue)]" href="/recovery">Recovery</Link></div></Card>
    </div>

    <section className="mesh-card mt-5 p-5"><h2 className="font-semibold">Other clouds</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">A provider being connected or browsable does not automatically mean encrypted managed uploads are enabled. Dropbox and TeraBox upload paths remain activation-gated until provider-specific live verification succeeds. Unsupported or unverified paths stay visibly disabled rather than silently falling back.</p><Link className="mt-3 inline-flex font-semibold text-[var(--blue)]" href="/clouds">Review provider status</Link></section>

    <div className="mt-5 flex flex-wrap gap-3"><Link className="btn" href="/downloads">Downloads</Link><Link className="btn" href="/analytics">Analytics</Link><Link className="btn" href="/diagnostics">Diagnostics</Link><Link className="btn" href="/about">About Meshly</Link></div>
  </div>;
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="mesh-card p-5"><div className="flex items-center gap-2"><span className="text-[var(--blue)]">{icon}</span><h2 className="font-semibold">{title}</h2></div><div className="mt-3 text-sm leading-6 text-[var(--muted)]">{children}</div></section>;
}
