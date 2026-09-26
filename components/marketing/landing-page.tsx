"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Cloud,
  CloudCog,
  FileArchive,
  FileCheck2,
  FileText,
  Folder,
  FolderKanban,
  HardDrive,
  KeyRound,
  LockKeyhole,
  Play,
  Route,
  ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { MeshlyLogo } from "@/components/brand/meshly-logo";
import { LivePlacementMap } from "@/components/marketing/live-placement-map";
import { PublicHeaderTools } from "@/components/public/public-header-tools";

const EASE = [0.16, 1, 0.3, 1] as const;

const features = [
  [FolderKanban, "One file workspace", "Browse and organize files through Meshly while each provider keeps its own account boundary underneath."],
  [LockKeyhole, "Encrypted by default", "Every new Meshly-managed file is encrypted before provider storage. There is no plaintext-storage switch."],
  [Route, "Smart whole-file routing", "For Google Drives, choose an account yourself or let Meshly select one healthy account where the whole encrypted file fits."],
  [CloudCog, "Provider-aware transfers", "Resumable transport, safe retries and concurrency rules adapt to the provider instead of using one aggressive global setting."],
  [Cloud, "Other Clouds", "TeraBox, Dropbox, MEGA and future adapters live in their own area, separate from Google Drives."],
  [FileCheck2, "Verified storage", "Logical and encrypted-object integrity metadata help Meshly detect incomplete, missing or modified managed content."],
] as const;

const folderCards = [
  { label: "Projects", detail: "8 items", icon: Folder },
  { label: "Photos", detail: "142 items", icon: Folder },
  { label: "Backups", detail: "4 items", icon: Folder },
] as const;

const fileRows = [
  { name: "portfolio-assets.zip", size: "8.4 GB", account: "Projects", icon: FileArchive, accent: "#4285F4" },
  { name: "client-handoff.pdf", size: "18.6 MB", account: "Personal", icon: FileText, accent: "#EA4335" },
  { name: "camera-backup-2026.zip", size: "6.2 GB", account: "Backup", icon: FileArchive, accent: "#34A853" },
] as const;

const googleAccounts = [
  ["Personal", "4.2 GB free", "#4285F4"],
  ["Projects", "18.6 GB free", "#34A853"],
  ["Backup", "12.1 GB free", "#FBBC04"],
] as const;

const otherClouds = [
  ["TeraBox", "Sequential-safe transfer profile", "Planned"],
  ["Dropbox", "Resumable provider adapter", "Planned"],
  ["MEGA", "SDK/API provider adapter", "Planned"],
] as const;

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: reduceMotion ? 0 : 0.7, delay, ease: EASE }} className={className}>
      {children}
    </motion.div>
  );
}

function ProductPreview() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 34, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.24, duration: 0.9, ease: EASE }} className="product-window mx-auto mt-14 max-w-5xl overflow-hidden bg-[var(--background)] text-left">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ea4335]" /><span className="h-2.5 w-2.5 rounded-full bg-[#fbbc04]" /><span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" />
        <span className="ml-2 text-xs font-semibold text-[var(--muted)] sm:ml-3">Meshly · Google Drives</span>
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] sm:flex"><LockKeyhole size={12} className="text-[var(--blue)]" /> encrypted uploads</div>
      </div>
      <div className="grid min-h-[400px] md:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-[var(--border)] bg-[var(--surface)] p-4 md:block">
          <div className="rounded-2xl bg-[var(--blue-soft)] px-4 py-3 text-sm font-semibold">Google Drives</div>
          <div className="mt-4 space-y-1 text-sm text-[var(--muted)]">{["Recent", "Starred", "Shared", "Trash"].map((item) => <div key={item} className="rounded-xl px-4 py-2">{item}</div>)}</div>
          <div className="my-4 h-px bg-[var(--border)]" />
          <div className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--muted)]">Other Clouds</div>
          <div className="mt-7 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Google storage</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]"><motion.div initial={{ width: 0 }} animate={{ width: "44%" }} transition={{ delay: 0.8, duration: 1, ease: EASE }} className="h-full rounded-full bg-[var(--blue)]" /></div>
          <div className="mt-2 text-xs leading-5 text-[var(--muted)]">19.7 GB used across accounts<br />34.9 GB available</div>
        </aside>
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div><div className="text-lg font-semibold tracking-[-.025em]">Google Drives</div><div className="mt-1 text-xs text-[var(--muted)]">One workspace · each file stays in one account</div></div>
            <div className="hidden rounded-full bg-[var(--blue)] px-4 py-2 text-xs font-semibold text-white sm:block">+ New</div>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {googleAccounts.map(([name, free, color]) => <div key={name} className="min-w-[150px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><span className="text-xs font-semibold">{name}</span></div><div className="mt-2 text-[11px] text-[var(--muted)]">{free}</div></div>)}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {folderCards.map(({ label, detail, icon: Icon }, index) => <motion.div key={label} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + index * 0.08, duration: 0.55, ease: EASE }} className="rounded-2xl bg-[var(--surface-strong)] p-4"><Icon size={20} className="text-[var(--muted)]" /><div className="mt-4 text-sm font-semibold">{label}</div><div className="mt-1 text-xs text-[var(--muted)]">{detail}</div></motion.div>)}
          </div>
          <div className="mt-6 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
            {fileRows.map(({ name, size, account, icon: Icon, accent }, index) => <motion.div key={name} initial={reduceMotion ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + index * 0.09, duration: 0.5, ease: EASE }} className="flex items-center justify-between gap-3 p-3.5 sm:p-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-strong)]"><Icon size={17} style={{ color: accent }} /></div><div className="min-w-0"><div className="truncate text-sm font-medium">{name}</div><div className="mt-0.5 text-[10px] text-[var(--muted)]">Encrypted · {account}</div></div></div><span className="shrink-0 text-xs text-[var(--muted)]">{size}</span></motion.div>)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StoryCopy() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="max-w-xl">
      <div className="text-xs font-semibold uppercase tracking-[.18em] text-[#8ab4f8]">Encrypt · route · verify</div>
      <h2 className="mt-5 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">The provider sees ciphertext. You keep the file.</h2>
      <p className="mt-5 max-w-lg text-base leading-7 text-white/62">For new Meshly-managed files, the browser encrypts the file before cloud storage. Google placement keeps the whole encrypted object in one healthy account chosen automatically or by you.</p>
      <div className="mt-8 grid gap-3">
        {["Generate a fresh per-file encryption key", "Keep each managed Google file whole in one account", "Verify the encrypted object before the logical file becomes ready"].map((text, index) => <motion.div key={text} initial={reduceMotion ? false : { opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.7 }} transition={{ delay: index * 0.09, duration: 0.55, ease: EASE }} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[.035] px-4 py-3 text-sm text-white/75 backdrop-blur-sm"><Check size={17} className="mt-0.5 shrink-0 text-[#81c995]" />{text}</motion.div>)}
      </div>
    </div>
  );
}

function ScrollStory() {
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 72, damping: 28, mass: 0.8 });
  const glowLeftY = useTransform(smooth, [0, 1], [48, -38]);
  const glowRightY = useTransform(smooth, [0, 1], [-38, 48]);
  return (
    <section ref={ref} id="architecture" className="relative overflow-clip bg-[#0d1528] text-white">
      <div className="deep-grid pointer-events-none absolute inset-0 opacity-55" />
      <motion.div style={reduceMotion ? undefined : { y: glowLeftY }} className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-[#4285F4]/16 blur-[100px]" />
      <motion.div style={reduceMotion ? undefined : { y: glowRightY }} className="pointer-events-none absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-[#b58cff]/10 blur-[100px]" />
      <div className="relative mx-auto max-w-7xl px-5 pb-8 pt-20 sm:px-8 lg:hidden"><StoryCopy /></div>
      <div data-placement-scroll-root className="relative min-h-[260svh] lg:hidden"><div className="sticky top-[72px] flex min-h-[calc(100svh-72px)] items-center px-4 py-5 sm:px-6"><LivePlacementMap /></div></div>
      <div data-placement-scroll-root className="relative hidden min-h-[280vh] lg:block"><div className="sticky top-0 flex min-h-screen items-center px-8 py-24"><div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[.86fr_1.14fr] lg:items-center"><StoryCopy /><LivePlacementMap /></div></div></div>
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
      <header className="public-header sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-4"><MeshlyLogo /><nav className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex"><a className="transition-colors hover:text-[var(--foreground)]" href="#features">Features</a><a className="transition-colors hover:text-[var(--foreground)]" href="#architecture">How it works</a><a className="transition-colors hover:text-[var(--foreground)]" href="#clouds">Clouds</a><Link className="transition-colors hover:text-[var(--foreground)]" href="/demo">Demo</Link></nav><div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><Link href="/login" className="focus-ring hidden rounded-full px-3 py-2 text-sm font-medium lg:inline-flex">Sign in</Link><PublicHeaderTools /><Link href="/onboarding" className="focus-ring rounded-full bg-[var(--blue)] px-4 py-2.5 text-[13px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 sm:px-5 sm:text-sm">Get started</Link></div></div>
      </header>

      <section className="hero-mesh relative px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-45" />
        <motion.div animate={reduceMotion ? undefined : { y: [0, -8, 0], x: [0, 4, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute left-[8%] top-28 h-40 w-40 rounded-full bg-[#8ab4f8]/8 blur-3xl" />
        <motion.div animate={reduceMotion ? undefined : { y: [0, 10, 0], x: [0, -4, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute right-[9%] top-20 h-44 w-44 rounded-full bg-[#d8a4ff]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl text-center">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-xl"><span className="h-2 w-2 rounded-full bg-[var(--green)]" />Google Drives + Other Clouds</motion.div>
          <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.72, ease: EASE }} className="hero-title mx-auto mt-8 max-w-5xl text-5xl font-semibold leading-[.96] tracking-[-.06em] sm:text-7xl"><span className="block">All your storage.</span><span className="meshly-editorial-gradient block">One Meshly workspace.</span></motion.h1>
          <motion.p initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.7, ease: EASE }} className="mx-auto mt-8 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">Connect cloud accounts, choose where files live or let Meshly route them, and store every new managed file as encrypted cloud data.</motion.p>
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.66, ease: EASE }} className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/onboarding" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--blue)] px-6 py-3 font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5">Create your workspace <ArrowRight size={18} /></Link><Link href="/demo" className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-6 py-3 font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><Play size={16} fill="currentColor" /> Watch interactive demo</Link></motion.div>
          <ProductPreview />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
        <Reveal className="max-w-2xl"><div className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--blue)]">Storage without pretending every cloud is the same</div><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">One workspace, provider-aware underneath.</h2><p className="mt-5 max-w-xl leading-7 text-[var(--muted)]">Meshly keeps the everyday file view simple while respecting account capacity, provider transfer rules and encrypted-object integrity.</p></Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, title, body], index) => <Reveal key={title} delay={index * 0.055}><motion.article whileHover={reduceMotion ? undefined : { y: -5 }} transition={{ duration: 0.28, ease: EASE }} className="mesh-card group min-h-[220px] p-6 transition-shadow duration-300 hover:shadow-[0_18px_50px_rgba(60,64,67,.09)]"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-strong)] transition-transform duration-300 group-hover:scale-[1.04]"><Icon size={22} /></div><h3 className="mt-6 text-lg font-semibold tracking-[-.02em]">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p></motion.article></Reveal>)}</div>
      </section>

      <ScrollStory />

      <section id="clouds" className="px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <Reveal className="max-w-2xl"><div className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--blue)]">Two clear storage areas</div><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Google Drives stay separate from Other Clouds.</h2><p className="mt-5 leading-7 text-[var(--muted)]">You always know which ecosystem you are managing, while search, transfers, encryption and integrity remain part of the same Meshly experience.</p></Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <Reveal><div className="mesh-card h-full p-6 sm:p-7"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)]"><HardDrive size={21} /></div><div><div className="text-lg font-semibold">Google Drives</div><div className="text-xs text-[var(--muted)]">Available now in the current provider layer</div></div></div><div className="mt-6 space-y-3">{googleAccounts.map(([name, free, color]) => <div key={name} className="flex items-center justify-between rounded-2xl bg-[var(--surface-strong)] p-4"><div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><span className="text-sm font-semibold">{name}</span></div><span className="text-xs text-[var(--muted)]">{free}</span></div>)}</div><div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]"><Route size={18} className="mt-0.5 shrink-0 text-[var(--blue)]" /><span>Auto choose or manually select an account. The encrypted file remains whole in that one Google account.</span></div></div></Reveal>
            <Reveal delay={0.08}><div className="mesh-card h-full p-6 sm:p-7"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--surface-strong)]"><Cloud size={21} /></div><div><div className="text-lg font-semibold">Other Clouds</div><div className="text-xs text-[var(--muted)]">Adapters are capability-gated before activation</div></div></div><div className="mt-6 space-y-3">{otherClouds.map(([name, detail, state]) => <div key={name} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{name}</span><span className="rounded-full bg-[var(--surface-strong)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">{state}</span></div><div className="mt-2 text-xs text-[var(--muted)]">{detail}</div></div>)}</div><div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--green)]" /><span>Every adapter must support Meshly encryption, integrity and safe transfer behavior before it can store real managed files.</span></div></div></Reveal>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-7xl"><Reveal className="grid gap-10 rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:p-14"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--blue)]">From upload to confidence</div><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em]">Encrypted storage that explains itself.</h2><p className="mt-5 max-w-xl leading-7 text-[var(--muted)]">Meshly keeps one clean file view while still showing the destination, encryption state, account health and integrity status when you need the details.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/demo" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--background)]">Explore the demo <ArrowRight size={16} /></Link><Link href="/onboarding" className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-5 py-3 text-sm font-semibold">Connect storage</Link></div></div><div className="grid gap-3 sm:grid-cols-2">{[["AES-256-GCM", "Managed-file encryption", "Fresh per-file key and authenticated frames"],["1 account", "Google placement", "Whole encrypted file stays in one account"],["2 hashes", "Integrity layers", "Logical file + encrypted physical object"],["1 workspace", "What the user sees", "Provider details stay available, not intrusive"]].map(([value, label, detail], index) => <motion.div key={label} initial={reduceMotion ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ delay: index * 0.07, duration: 0.55, ease: EASE }} className="rounded-[24px] border border-[var(--border)] bg-[var(--background)] p-5 shadow-[0_8px_30px_rgba(60,64,67,.05)]"><div className="text-2xl font-semibold tracking-[-.04em]">{value}</div><div className="mt-4 text-sm font-semibold">{label}</div><div className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</div></motion.div>)}</div></Reveal></div>
      </section>

      <section className="px-5 pb-24 sm:px-8"><Reveal className="mx-auto flex max-w-5xl flex-col items-center rounded-[34px] border border-[var(--border)] bg-[var(--surface-strong)] px-6 py-12 text-center sm:px-10"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--background)] text-[var(--blue)]"><KeyRound size={22} /></div><h2 className="mt-5 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Encryption is not a separate vault.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">For new Meshly-managed content, encryption is the storage format itself. Cloud providers receive encrypted objects while Meshly preserves the logical filename and file experience.</p></Reveal></section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-[var(--border)] px-5 py-10 text-sm text-[var(--muted)] sm:px-8 md:flex-row md:items-center md:justify-between"><MeshlyLogo /><span>One workspace. Every connected cloud.</span></footer>
    </main>
  );
}
