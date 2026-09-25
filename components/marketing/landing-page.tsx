"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CloudCog,
  Combine,
  FileArchive,
  FileCheck2,
  FileText,
  Folder,
  FolderKanban,
  HardDrive,
  Play,
  ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { MeshlyLogo } from "@/components/brand/meshly-logo";
import { LivePlacementMap } from "@/components/marketing/live-placement-map";

const EASE = [0.16, 1, 0.3, 1] as const;

const features = [
  [Combine, "One unified filesystem", "Browse folders and files without caring which Google account physically holds the bytes."],
  [HardDrive, "Pooled real quota", "Meshly reads each account’s actual available Drive quota and presents the combined capacity."],
  [FileCheck2, "Transparent large files", "Oversized files can span integrity-checked byte ranges across accounts and reconstruct as one exact file."],
  [CloudCog, "Resumable transfers", "Google Drive resumable sessions keep large transfers efficient and restartable after interruptions."],
  [FolderKanban, "Logical folders", "Moving folders changes Meshly metadata first, avoiding unnecessary physical re-uploads between accounts."],
  [ShieldCheck, "Security by design", "Encrypted refresh tokens, scoped access, strict sessions, CSP and integrity verification are part of the core."],
] as const;

const folderCards = [
  { label: "Projects", detail: "8 items", icon: Folder },
  { label: "Photos", detail: "142 items", icon: Folder },
  { label: "Backups", detail: "4 items", icon: Folder },
] as const;

const fileRows = [
  { name: "portfolio-assets.zip", size: "8.4 GB", icon: FileArchive, accent: "#4285F4" },
  { name: "client-handoff.pdf", size: "18.6 MB", icon: FileText, accent: "#EA4335" },
  { name: "camera-backup-2026.zip", size: "14.2 GB", icon: FileArchive, accent: "#34A853" },
] as const;

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduceMotion ? 0 : 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ProductPreview() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 34, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.24, duration: 0.9, ease: EASE }}
      className="product-window mx-auto mt-14 max-w-5xl overflow-hidden bg-white text-left"
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ea4335]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#fbbc04]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" />
        <span className="ml-3 text-xs font-semibold text-[var(--muted)]">Meshly · My Drive</span>
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-[#e4e8ee] bg-[#f8fafd] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[var(--green)]" /> 3 accounts healthy
        </div>
      </div>
      <div className="grid min-h-[390px] md:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-[var(--border)] bg-[#f8fafd] p-4 md:block">
          <div className="rounded-2xl bg-[#c2e7ff] px-4 py-3 text-sm font-semibold">My Drive</div>
          <div className="mt-4 space-y-1 text-sm text-[var(--muted)]">
            {["Recent", "Starred", "Shared", "Trash"].map((item) => <div key={item} className="rounded-xl px-4 py-2">{item}</div>)}
          </div>
          <div className="mt-8 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Storage pool</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e1e6ed]">
            <motion.div initial={{ width: 0 }} animate={{ width: "44%" }} transition={{ delay: 0.8, duration: 1, ease: EASE }} className="h-full rounded-full bg-[#0b57d0]" />
          </div>
          <div className="mt-2 text-xs text-[var(--muted)]">19.7 GB used · 25.3 GB free</div>
          <div className="mt-5 flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4285F4]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34A853]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FBBC04]" />
          </div>
        </aside>
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold tracking-[-.025em]">My Drive</div>
              <div className="mt-1 text-xs text-[var(--muted)]">One workspace across every connected account</div>
            </div>
            <div className="hidden rounded-full bg-[#0b57d0] px-4 py-2 text-xs font-semibold text-white sm:block">+ New</div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {folderCards.map(({ label, detail, icon: Icon }, index) => (
              <motion.div key={label} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + index * 0.08, duration: 0.55, ease: EASE }} className="rounded-2xl border border-transparent bg-[#f0f4f9] p-4 transition-colors hover:border-[#d7e2ef] hover:bg-[#eaf1f8]">
                <Icon size={20} className="text-[#5f6368]" />
                <div className="mt-4 text-sm font-semibold">{label}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">{detail}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-7 text-xs font-semibold uppercase tracking-[.13em] text-[var(--muted)]">Files</div>
          <div className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            {fileRows.map(({ name, size, icon: Icon, accent }, index) => (
              <motion.div key={name} initial={reduceMotion ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + index * 0.09, duration: 0.5, ease: EASE }} className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f5f7fb]"><Icon size={17} style={{ color: accent }} /></div>
                  <span className="truncate text-sm font-medium">{name}</span>
                </div>
                <span className="shrink-0 text-xs text-[var(--muted)]">{size}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ScrollStory() {
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 105, damping: 26, mass: 0.45 });
  const glowLeftY = useTransform(smooth, [0, 1], [60, -50]);
  const glowRightY = useTransform(smooth, [0, 1], [-50, 65]);

  return (
    <section ref={ref} id="architecture" className="relative min-h-[170vh] bg-[#0f172a] text-white">
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden px-5 py-24 sm:px-8">
        <div className="deep-grid pointer-events-none absolute inset-0 opacity-60" />
        <motion.div style={reduceMotion ? undefined : { y: glowLeftY }} className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-[#4285F4]/20 blur-[90px]" />
        <motion.div style={reduceMotion ? undefined : { y: glowRightY }} className="pointer-events-none absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-[#34A853]/15 blur-[90px]" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[.86fr_1.14fr] lg:items-center">
          <div className="max-w-xl">
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-[#8ab4f8]">One logical file · many storage nodes</div>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">The complexity moves underneath the interface.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/62">Meshly plans storage, creates safe byte ranges, uploads to the right accounts and reconstructs the original stream later. The user keeps working with one filename in one folder.</p>
            <div className="mt-8 grid gap-3">
              {["Keep the file whole when one account safely fits it", "Split deterministic byte ranges only when capacity requires it", "Verify every physical part before the logical file becomes ready"].map((text, index) => (
                <motion.div key={text} initial={reduceMotion ? false : { opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.7 }} transition={{ delay: index * 0.09, duration: 0.55, ease: EASE }} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[.035] px-4 py-3 text-sm text-white/75 backdrop-blur-sm">
                  <Check size={17} className="mt-0.5 shrink-0 text-[#81c995]" />{text}
                </motion.div>
              ))}
            </div>
          </div>

          <LivePlacementMap />
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 });

  return (
    <main className="overflow-x-clip">
      <motion.div className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-[var(--blue)]" style={{ scaleX: progress }} />
      <header className="sticky top-0 z-50 border-b border-black/[.035] bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <MeshlyLogo />
          <nav className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex">
            <a className="transition-colors hover:text-[var(--foreground)]" href="#features">Features</a>
            <a className="transition-colors hover:text-[var(--foreground)]" href="#architecture">How it works</a>
            <Link className="transition-colors hover:text-[var(--foreground)]" href="/demo">Demo</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="focus-ring hidden rounded-full px-4 py-2 text-sm font-medium sm:inline-flex">Sign in</Link>
            <Link href="/onboarding" className="focus-ring rounded-full bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5">Get started</Link>
          </div>
        </div>
      </header>

      <section className="gradient-mesh relative px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <motion.div animate={reduceMotion ? undefined : { y: [0, -10, 0], x: [0, 5, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute left-[8%] top-28 h-44 w-44 rounded-full bg-[#4285F4]/10 blur-3xl" />
        <motion.div animate={reduceMotion ? undefined : { y: [0, 12, 0], x: [0, -5, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute right-[9%] top-20 h-48 w-48 rounded-full bg-[#34A853]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl text-center">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#dbe4ef] bg-white/78 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-xl"><span className="h-2 w-2 rounded-full bg-[var(--green)]" />Unified Google Drive storage</motion.div>
          <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.72, ease: EASE }} className="mx-auto mt-7 max-w-5xl text-5xl font-semibold leading-[.98] tracking-[-.065em] sm:text-7xl">All your storage.<br /><span className="meshly-editorial-gradient mt-1 text-[1.04em] sm:mt-2 sm:text-[1.02em]">One Meshly workspace.</span></motion.h1>
          <motion.p initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.7, ease: EASE }} className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">Connect multiple Google accounts, pool their available storage, and manage every file through a single Drive-like interface.</motion.p>
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.66, ease: EASE }} className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/onboarding" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--blue)] px-6 py-3 font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5">Create your workspace <ArrowRight size={18} /></Link>
            <Link href="/demo" className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-6 py-3 font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><Play size={16} fill="currentColor" /> Watch interactive demo</Link>
          </motion.div>
          <ProductPreview />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
        <Reveal className="max-w-2xl"><div className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--blue)]">Built for the whole storage pool</div><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Account boundaries disappear from everyday file management.</h2><p className="mt-5 max-w-xl leading-7 text-[var(--muted)]">Meshly keeps the physical storage map available when you need it, but removes it from the normal experience of browsing, moving, sharing and downloading files.</p></Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([Icon, title, body], index) => (
            <Reveal key={title} delay={index * 0.055}>
              <motion.article whileHover={reduceMotion ? undefined : { y: -5 }} transition={{ duration: 0.28, ease: EASE }} className="mesh-card group min-h-[220px] p-6 transition-shadow duration-300 hover:shadow-[0_18px_50px_rgba(60,64,67,.09)]">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-strong)] transition-transform duration-300 group-hover:scale-[1.04]"><Icon size={22} /></div>
                <h3 className="mt-6 text-lg font-semibold tracking-[-.02em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </section>

      <ScrollStory />

      <section className="px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <Reveal className="grid gap-10 rounded-[32px] border border-[#dfe5ec] bg-[#f8fafd] p-6 sm:p-10 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:p-14">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--blue)]">From capacity to confidence</div>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em]">A storage pool that explains itself.</h2>
              <p className="mt-5 max-w-xl leading-7 text-[var(--muted)]">Normal users see one clean workspace. When you want details, Meshly can show exactly how a file was placed, what is healthy, and whether every byte still verifies.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/demo" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white">Explore the demo <ArrowRight size={16} /></Link>
                <Link href="/onboarding" className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold">Connect storage</Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["45 GB", "Combined capacity", "Across three connected accounts"],
                ["3", "Healthy storage nodes", "Quota and auth checked automatically"],
                ["SHA-256", "End-to-end integrity", "Parts and reconstructed file verified"],
                ["1 file", "What the user sees", "Physical chunk layout stays underneath"],
              ].map(([value, label, detail], index) => (
                <motion.div key={label} initial={reduceMotion ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ delay: index * 0.07, duration: 0.55, ease: EASE }} className="rounded-[24px] border border-white bg-white p-5 shadow-[0_8px_30px_rgba(60,64,67,.06)]">
                  <div className="text-2xl font-semibold tracking-[-.04em]">{value}</div><div className="mt-4 text-sm font-semibold">{label}</div><div className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-[var(--border)] px-5 py-10 text-sm text-[var(--muted)] sm:px-8 md:flex-row md:items-center md:justify-between"><MeshlyLogo /><span>One workspace. Every connected cloud.</span></footer>
    </main>
  );
}
