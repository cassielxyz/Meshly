"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Cloud,
  CloudCog,
  CloudUpload,
  FileArchive,
  Folder,
  HardDrive,
  KeyRound,
  LockKeyhole,
  Pause,
  Play,
  Route,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MeshlyLogo } from "@/components/brand/meshly-logo";
import { PublicHeaderTools } from "@/components/public/public-header-tools";

const EASE = [0.16, 1, 0.3, 1] as const;
const AUTO_STEP_MS = 6200;

const STEPS = [
  { eyebrow: "Step 1 · Connect", title: "Google Drives stay distinct inside one workspace.", body: "Meshly shows each connected Google account with its own health and available capacity. Other cloud providers live in a separate section." },
  { eyebrow: "Step 2 · Choose destination", title: "Auto choose, or pick the Google account yourself.", body: "For Google managed uploads, the entire encrypted file is assigned to one healthy account with enough space. Meshly does not split it across Google accounts." },
  { eyebrow: "Step 3 · Encrypt", title: "The file becomes ciphertext before cloud storage.", body: "A fresh per-file key protects authenticated AES-256-GCM frames. The provider receives an opaque object instead of the original managed file bytes." },
  { eyebrow: "Step 4 · Transfer", title: "Resumable transfer follows the provider’s safe profile.", body: "Google uses resumable upload sessions. Retry and concurrency behavior is provider-aware so speed does not come from blindly flooding the remote service." },
  { eyebrow: "Step 5 · Verify & ready", title: "Only a verified encrypted object becomes a ready Meshly file.", body: "Meshly tracks logical-file integrity separately from encrypted-object integrity, then decrypts authenticated frames when the user downloads or requests a byte range." },
] as const;

const accounts = [
  { label: "Personal", email: "alex.personal@gmail.com", free: "4.2 GB free", color: "#4285F4", healthy: true },
  { label: "Projects", email: "alex.projects@gmail.com", free: "18.6 GB free", color: "#34A853", healthy: true },
  { label: "Backup", email: "alex.backup@gmail.com", free: "12.1 GB free", color: "#FBBC04", healthy: true },
] as const;

function AccountCard({ account, index, selected = false }: { account: (typeof accounts)[number]; index: number; selected?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: selected ? 1.015 : 1 }} transition={{ delay: 0.07 * index, duration: 0.5, ease: EASE }} className={`relative overflow-hidden rounded-[22px] border bg-[var(--surface)] p-4 shadow-[0_10px_30px_rgba(31,41,55,.05)] ${selected ? "border-[color-mix(in_srgb,var(--green)_48%,var(--border))]" : "border-[var(--border)]"}`}>
      {selected && <div className="absolute inset-x-0 top-0 h-1 bg-[var(--green)]" />}
      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-strong)]"><Cloud size={19} style={{ color: account.color }} /></div><div className="min-w-0"><div className="text-sm font-semibold">{account.label}</div><div className="truncate text-xs text-[var(--muted)]">{account.email}</div></div></div>{selected ? <span className="rounded-full bg-[color-mix(in_srgb,var(--green)_12%,transparent)] px-2 py-1 text-[10px] font-semibold text-[var(--green)]">Selected</span> : <CheckCircle2 className="shrink-0 text-[var(--green)]" size={18} />}</div>
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]"><span>{account.free}</span><span>{account.healthy ? "Healthy" : "Unavailable"}</span></div>
    </motion.div>
  );
}

function Stage({ step }: { step: number }) {
  if (step === 0) return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">{accounts.map((account, index) => <AccountCard key={account.email} account={account} index={index} />)}</div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.5, ease: EASE }} className="grid gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--background)] text-[var(--blue)]"><CloudCog size={19} /></div>
        <div><div className="text-sm font-semibold">Other Clouds</div><div className="mt-1 text-xs leading-5 text-[var(--muted)]">TeraBox · Dropbox · MEGA live in a separate provider area and must pass Meshly capability checks before activation.</div></div>
        <span className="w-fit rounded-full bg-[var(--background)] px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)]">Adapters planned</span>
      </motion.div>
    </div>
  );

  if (step === 1) return (
    <div className="grid gap-4 lg:grid-cols-[.88fr_1.12fr] lg:items-start">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_40px_rgba(31,41,55,.06)] sm:p-5">
        <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-strong)] text-[var(--blue)]"><FileArchive size={23} /></div><div className="min-w-0"><div className="break-words text-sm font-semibold sm:text-base">camera-backup-2026.zip</div><div className="mt-1 text-xs text-[var(--muted)]">8.4 GB · new managed upload</div></div></div>
        <div className="mt-5 rounded-2xl bg-[var(--surface-strong)] p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-[var(--blue)]"><Route size={14} /> Placement rule</div><div className="mt-2 text-sm leading-6">Keep the whole encrypted file in one Google account.</div></div>
      </motion.div>
      <div className="space-y-2.5">{accounts.map((account, index) => <AccountCard key={account.email} account={account} index={index} selected={account.label === "Projects"} />)}<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }} className="rounded-2xl bg-[#111827] px-4 py-3 text-xs leading-5 text-white/70"><span className="font-semibold text-white">Auto choice: Projects.</span> It has enough available capacity for the whole encrypted object. The user can override Auto and choose another compatible account.</motion.div></div>
    </div>
  );

  if (step === 2) return (
    <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_40px_rgba(31,41,55,.06)] sm:p-7">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: EASE }} className="rounded-[22px] bg-[var(--surface-strong)] p-5"><FileArchive size={22} className="text-[var(--blue)]" /><div className="mt-4 text-sm font-semibold">camera-backup-2026.zip</div><div className="mt-1 text-xs text-[var(--muted)]">8.4 GB original file</div></motion.div>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.16, type: "spring", stiffness: 260, damping: 21 }} className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--blue)_13%,var(--surface))] text-[var(--blue)]"><LockKeyhole size={24} /></motion.div>
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.45, ease: EASE }} className="rounded-[22px] bg-[#111827] p-5 text-white"><KeyRound size={22} className="text-[#9ec1ff]" /><div className="mt-4 text-sm font-semibold">Opaque encrypted object</div><div className="mt-1 text-xs text-white/50">AES-256-GCM authenticated frames</div></motion.div>
      </div>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-3">{["Fresh 256-bit file key", "Authenticated frame metadata", "No plaintext-storage switch"].map((item, index) => <motion.div key={item} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 + index * 0.08, duration: 0.4, ease: EASE }} className="rounded-2xl border border-[var(--border)] p-3.5 text-sm font-medium"><Check size={15} className="mb-2 text-[var(--green)]" />{item}</motion.div>)}</div>
    </div>
  );

  if (step === 3) return (
    <div className="grid gap-4 lg:grid-cols-[1fr_.78fr]">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: EASE }} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-strong)]"><CloudUpload size={20} className="text-[#34A853]" /></div><div><div className="text-sm font-semibold">Projects · Google Drive</div><div className="mt-1 text-xs text-[var(--muted)]">Opaque encrypted object</div></div></div><span className="rounded-full bg-[color-mix(in_srgb,var(--green)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold text-[var(--green)]">Resumable</span></div>
        <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-[var(--surface-strong)]"><motion.div initial={{ width: "3%" }} animate={{ width: "100%" }} transition={{ duration: 2.7, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-[#34A853]" /></div>
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]"><span>Encrypted frames uploading</span><span>provider-aware retry</span></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.46, ease: EASE }} className="rounded-[24px] bg-[#111827] p-5 text-white sm:p-6"><div className="text-xs font-semibold uppercase tracking-[.13em] text-white/45">Transfer policy</div><div className="mt-4 space-y-3 text-sm text-white/72"><div className="flex gap-3"><Check size={16} className="mt-0.5 shrink-0 text-[#81c995]" />Resume at authenticated frame boundaries</div><div className="flex gap-3"><Check size={16} className="mt-0.5 shrink-0 text-[#81c995]" />Back off on throttling/transient failure</div><div className="flex gap-3"><Check size={16} className="mt-0.5 shrink-0 text-[#81c995]" />Do not publish an incomplete logical file</div></div></motion.div>
    </div>
  );

  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_40px_rgba(31,41,55,.06)] sm:p-7">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: EASE }} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:gap-4"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-strong)] text-[var(--blue)]"><FileArchive size={21} /></div><div className="min-w-0 flex-1"><div className="break-words text-sm font-semibold">camera-backup-2026.zip</div><div className="mt-1 text-xs text-[var(--muted)]">8.4 GB · encrypted object in Projects · one logical file</div></div></div><motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.22, type: "spring", stiffness: 280, damping: 20 }} className="flex w-fit shrink-0 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--green)_13%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--green)]"><CheckCircle2 size={14} /> Ready</motion.div></motion.div>
      <div className="mt-5 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">{["Logical SHA-256 tracked", "Ciphertext size/hash verified", "Authenticated range downloads"].map((item, index) => <motion.div key={item} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index + 0.18, duration: 0.4, ease: EASE }} className="rounded-2xl bg-[var(--surface-strong)] p-3.5 text-sm font-medium sm:p-4"><ShieldCheck size={16} className="mb-2.5 text-[var(--green)] sm:mb-3" />{item}</motion.div>)}</div>
    </div>
  );
}

export function DemoExperience() {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!autoPlay || reduceMotion) return;
    const timer = window.setTimeout(() => setStep((current) => (current + 1) % STEPS.length), AUTO_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [step, autoPlay, reduceMotion]);
  const current = STEPS[step];
  const selectStep = (next: number) => { setAutoPlay(false); setStep(Math.min(STEPS.length - 1, Math.max(0, next))); };

  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--background)] pb-[env(safe-area-inset-bottom)]">
      <header className="public-header sticky top-0 z-40 border-b border-[var(--border)] backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-8 sm:py-4"><Link href="/" aria-label="Back to Meshly home" className="shrink-0"><MeshlyLogo /></Link><div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><Link href="/" className="focus-ring hidden rounded-full px-3 py-2 text-sm font-medium text-[var(--muted)] lg:inline-flex">Exit demo</Link><PublicHeaderTools /><Link href="/onboarding" className="focus-ring rounded-full bg-[var(--blue)] px-3.5 py-2.5 text-[12px] font-semibold text-white sm:px-4 sm:text-sm"><span className="sm:hidden">Create</span><span className="hidden sm:inline">Create workspace</span></Link></div></div></header>

      <section className="demo-grid relative px-3 py-7 sm:px-8 sm:py-14">
        <div className="pointer-events-none absolute left-[8%] top-16 h-44 w-44 rounded-full bg-[#8ab4f8]/8 blur-3xl sm:h-52 sm:w-52" /><div className="pointer-events-none absolute right-[8%] top-28 h-44 w-44 rounded-full bg-[#d8a4ff]/7 blur-3xl sm:h-52 sm:w-52" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_84%,transparent)] px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur"><span className="h-2 w-2 rounded-full bg-[var(--green)]" /> Interactive product demo</div><h1 className="mt-4 text-[32px] font-semibold leading-[1.05] tracking-[-.045em] sm:mt-5 sm:text-5xl">See the encrypted path from file to cloud.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)] sm:mt-4 sm:text-base">A safe simulated session showing Google whole-file placement, encryption, resumable transfer and verification. No real account or file is touched.</p></div><button type="button" onClick={() => setAutoPlay((value) => !value)} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold shadow-sm" aria-pressed={autoPlay}>{autoPlay ? <Pause size={15} /> : <Play size={15} />}{autoPlay ? "Pause tour" : "Play tour"}</button></div>

          <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(60,64,67,.12)] sm:rounded-[30px]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3.5 sm:px-5 sm:py-4"><span className="h-2.5 w-2.5 rounded-full bg-[#ea4335]" /><span className="h-2.5 w-2.5 rounded-full bg-[#fbbc04]" /><span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" /><div className="ml-2 min-w-0 truncate text-xs font-semibold text-[var(--muted)] sm:ml-3">Meshly · Demo workspace</div><div className="ml-auto shrink-0 rounded-full bg-[var(--surface-strong)] px-2.5 py-1 text-[10px] font-semibold text-[var(--blue)] sm:px-3 sm:text-[11px]">SIMULATED</div></div>
            <div className="grid lg:min-h-[590px] lg:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-[var(--border)] bg-[var(--background)]/70 p-4 lg:block"><div className="rounded-2xl bg-[var(--blue-soft)] px-4 py-3 text-sm font-semibold">Google Drives</div><div className="mt-4 space-y-1.5 text-sm text-[var(--muted)]">{["Recent", "Starred", "Shared", "Trash"].map((item) => <div key={item} className="rounded-xl px-4 py-2">{item}</div>)}</div><div className="my-4 h-px bg-[var(--border)]" /><div className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[var(--muted)]"><Cloud size={15} />Other Clouds</div><div className="mt-8 text-[11px] font-semibold uppercase tracking-[.13em] text-[var(--muted)]">Demo folders</div><div className="mt-3 space-y-2">{["Projects", "Photos", "Backups"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"><Folder size={15} className="text-[var(--blue)]" />{item}</div>)}</div></aside>
              <div className="flex min-w-0 flex-col p-4 sm:p-7 lg:p-9">
                <div className="flex items-start justify-between gap-4 sm:gap-5"><div className="min-w-0 flex-1"><AnimatePresence mode="wait"><motion.div key={`${step}-copy`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0 : 0.4, ease: EASE }}><div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--blue)] sm:text-xs">{current.eyebrow}</div><h2 className="mt-2 max-w-2xl text-[26px] font-semibold leading-[1.12] tracking-[-.035em] sm:text-3xl">{current.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{current.body}</p></motion.div></AnimatePresence></div><div className="hidden shrink-0 text-xs font-semibold text-[var(--muted)] sm:block">{step + 1} / {STEPS.length}</div></div>
                <div className="mt-6 flex-1 sm:mt-8"><AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, y: 14, scale: 0.994 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.996 }} transition={{ duration: reduceMotion ? 0 : 0.46, ease: EASE }}><Stage step={step} /></motion.div></AnimatePresence></div>
                <div className="mt-7 pb-[max(.25rem,env(safe-area-inset-bottom))] sm:mt-8"><div className="mb-4 grid grid-cols-5 gap-2">{STEPS.map((_, index) => <button key={index} type="button" onClick={() => selectStep(index)} aria-label={`Go to demo step ${index + 1}`} className="group relative h-1.5 overflow-hidden rounded-full bg-[var(--surface-strong)]"><motion.span className="absolute inset-y-0 left-0 rounded-full bg-[var(--blue)]" animate={{ width: index < step ? "100%" : index === step ? "100%" : "0%" }} transition={{ duration: reduceMotion ? 0 : index === step && autoPlay ? AUTO_STEP_MS / 1000 : 0.3, ease: index === step && autoPlay ? "linear" : EASE }} /></button>)}</div><div className="flex items-center justify-between gap-3"><button type="button" onClick={() => selectStep(step - 1)} disabled={step === 0} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold disabled:opacity-40"><ArrowLeft size={15} /> Back</button>{step < STEPS.length - 1 ? <button type="button" onClick={() => selectStep(step + 1)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--blue)] px-5 py-2 text-sm font-semibold text-white">Next <ArrowRight size={15} /></button> : <Link href="/onboarding" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--blue)] px-5 py-2 text-sm font-semibold text-white">Build my workspace <ArrowRight size={15} /></Link>}</div></div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 pb-2 text-[11px] text-[var(--muted)] sm:mt-7 sm:gap-x-6 sm:text-xs"><span className="inline-flex items-center gap-2"><Check size={14} className="text-[var(--green)]" /> No sign-in required</span><span className="inline-flex items-center gap-2"><Check size={14} className="text-[var(--green)]" /> No real files touched</span><span className="inline-flex items-center gap-2"><Check size={14} className="text-[var(--green)]" /> Mirrors Meshly’s current managed-file model</span></div>
        </div>
      </section>
    </main>
  );
}
