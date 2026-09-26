import Link from "next/link";
import { MeshlyLogo } from "@/components/brand/meshly-logo";
import { PublicHeaderTools } from "@/components/public/public-header-tools";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="public-header sticky top-0 z-40 border-b border-[var(--border)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-4">
          <Link href="/" aria-label="Meshly home" className="shrink-0"><MeshlyLogo /></Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/demo" className="focus-ring hidden rounded-full px-3 py-2 text-sm font-medium text-[var(--muted)] sm:inline-flex">Demo</Link>
            <PublicHeaderTools />
            <Link href="/onboarding" className="focus-ring rounded-full bg-[var(--blue)] px-4 py-2.5 text-xs font-semibold text-white sm:px-5 sm:text-sm">Get started</Link>
          </div>
        </div>
      </header>

      <section className="hero-mesh relative overflow-hidden border-b border-[var(--border)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="relative mx-auto max-w-4xl">
          <div className="text-xs font-semibold uppercase tracking-[.17em] text-[var(--blue)]">{eyebrow}</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">{title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-[var(--muted)] sm:text-lg">{intro}</p>
          <div className="mt-5 text-xs font-medium text-[var(--muted)]">Last updated · 27 September 2026</div>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="space-y-10 text-[15px] leading-7 text-[var(--muted)] [&_a]:font-semibold [&_a]:text-[var(--blue)] [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-[-.035em] [&_h2]:text-[var(--foreground)] [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-[var(--foreground)] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
        <div className="mt-14 flex flex-wrap gap-3 border-t border-[var(--border)] pt-7 text-sm">
          <Link href="/" className="focus-ring rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-semibold">Back to Meshly</Link>
          <Link href="/privacy" className="focus-ring rounded-full px-4 py-2 font-semibold text-[var(--muted)]">Privacy</Link>
          <Link href="/terms" className="focus-ring rounded-full px-4 py-2 font-semibold text-[var(--muted)]">Terms</Link>
        </div>
      </article>
    </main>
  );
}
