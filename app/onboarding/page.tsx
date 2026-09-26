import Link from "next/link";
import { CheckCircle2, Cloud, ShieldCheck, Sparkles } from "lucide-react";
import { MeshlyLogo } from "@/components/brand/meshly-logo";

export const metadata = { title: "Welcome" };

const steps = [
  [Cloud, "Connect storage", "Add one or more Google accounts. Meshly reads the real available quota for each account."],
  [Sparkles, "Create one workspace", "Folders and files are indexed into a single logical filesystem instead of exposing account boundaries."],
  [ShieldCheck, "Keep control", "Tokens are encrypted, transfers are integrity checked, and account access can be revoked at any time."],
];

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)] p-5 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Back to Meshly home" className="shrink-0">
            <MeshlyLogo />
          </Link>
          <div data-meshly-header-actions className="flex min-h-9 items-center gap-2" />
        </header>

        <section className="mesh-card mt-8 overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_.9fr]">
            <div className="p-8 sm:p-12">
              <div className="text-sm font-semibold text-[var(--blue)]">GET STARTED</div>
              <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Turn separate Drives into one Meshly workspace.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">Start with your primary Google account, then connect additional storage whenever you need it.</p>
              <div className="mt-9 space-y-6">
                {steps.map(([Icon, title, body]) => {
                  const C = Icon as typeof Cloud;
                  return (
                    <div key={String(title)} className="flex gap-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--surface-strong)]"><C size={20} /></div>
                      <div>
                        <h2 className="font-semibold">{String(title)}</h2>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{String(body)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <a href="/api/auth/google/start?link=1" className="focus-ring rounded-full bg-[var(--blue)] px-6 py-3 text-sm font-semibold text-white">Connect Google account</a>
                <Link href="/demo" className="focus-ring rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold">Explore demo workspace</Link>
              </div>
            </div>
            <aside className="bg-[#eef6ff] p-8 sm:p-12">
              <div className="rounded-[26px] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between"><span className="font-semibold">Unified storage</span><CheckCircle2 className="text-[var(--green)]" size={20} /></div>
                <div className="mt-6 text-4xl font-semibold tracking-[-.04em]">45.0 GB</div>
                <div className="mt-2 text-sm text-[var(--muted)]">Across 3 connected accounts</div>
                <div className="mt-7 h-3 overflow-hidden rounded-full bg-[#e9eef6]"><div className="h-full w-[44%] rounded-full bg-[var(--blue)]" /></div>
                <div className="mt-7 grid gap-3 text-sm">
                  <div className="flex justify-between"><span>Used</span><strong>19.7 GB</strong></div>
                  <div className="flex justify-between"><span>Available</span><strong>25.3 GB</strong></div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
