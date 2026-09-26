"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Cloud,
  CloudUpload,
  FileArchive,
  Folder,
  HardDrive,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MeshlyLogo } from "@/components/brand/meshly-logo";
import { PublicHeaderTools } from "@/components/public/public-header-tools";

const EASE = [0.16, 1, 0.3, 1] as const;
const AUTO_STEP_MS = 6200;

const STEPS = [
  {
    eyebrow: "Step 1 · Connect",
    title: "Three accounts become one storage pool.",
    body: "Meshly reads each account’s real available capacity and keeps the physical account boundary out of your normal file workflow.",
  },
  {
    eyebrow: "Step 2 · Plan",
    title: "A large file is planned before a single byte moves.",
    body: "Meshly checks safe capacity, keeps a reserve on every account, and prefers a single account whenever the full file can fit.",
  },
  {
    eyebrow: "Step 3 · Split only if needed",
    title: "One logical file can span multiple accounts.",
    body: "When no single account can safely hold the file, deterministic byte ranges are assigned across healthy storage nodes with SHA-256 integrity metadata.",
  },
  {
    eyebrow: "Step 4 · Transfer",
    title: "The browser uploads parts directly to Google.",
    body: "Resumable sessions keep multi-gigabyte transfers efficient while Meshly tracks progress and refuses to publish an incomplete logical file.",
  },
  {
    eyebrow: "Step 5 · Reconstruct",
    title: "You still see one file, exactly as uploaded.",
    body: "Downloads stream the required byte ranges back in order and verify the complete file hash, so the storage layout stays invisible to the user.",
  },
] as const;

const accounts = [
  { label: "Personal", email: "alex.personal@gmail.com", free: "4.2 GB free", color: "#4285F4", width: 28 },
  { label: "Projects", email: "alex.projects@gmail.com", free: "8.6 GB free", color: "#34A853", width: 57 },
  { label: "Archive", email: "alex.archive@gmail.com", free: "12.1 GB free", color: "#FBBC04", width: 81 },
] as const;

const allocation = [
  { label: "Personal", size: "4.0 GB", width: 28, color: "#4285F4" },
  { label: "Projects", size: "6.0 GB", width: 42, color: "#34A853" },
  { label: "Archive", size: "4.2 GB", width: 30, color: "#FBBC04" },
] as const;

function AccountCard({ account, index }: { account: (typeof accounts)[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.07 * index, duration: 0.5, ease: EASE }}
      className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_10px_30px_rgba(31,41,55,.05)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-strong)]">
            <Cloud size={19} style={{ color: account.color }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{account.label}</div>
            <div className="truncate text-xs text-[var(--muted)]">{account.email}</div>
          </div>
        </div>
        <CheckCircle2 className="shrink-0 text-[var(--green)]" size={18} />
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${account.width}%` }}
          transition={{ delay: 0.16 + index * 0.07, duration: 0.75, ease: EASE }}
          className="h-full rounded-full"
          style={{ backgroundColor: account.color }}
        />
      </div>
      <div className="mt-2 text-xs text-[var(--muted)]">{account.free}</div>
    </motion.div>
  );
}

function Stage({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {accounts.map((account, index) => (
          <AccountCard key={account.email} account={account} index={index} />
        ))}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
          className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 sm:px-5 md:col-span-3"
        >
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--blue)] sm:text-xs">Unified capacity</div>
            <div className="mt-1 text-base font-semibold text-[var(--foreground)] sm:text-lg">24.9 GB safely available</div>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--background)] text-[var(--blue)] shadow-sm">
            <HardDrive size={20} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_40px_rgba(31,41,55,.06)] sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-strong)] text-[var(--blue)] sm:h-14 sm:w-14">
                <FileArchive size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="break-words text-[15px] font-semibold leading-5 sm:text-base">camera-backup-2026.zip</div>
                <div className="mt-1 text-xs text-[var(--muted)] sm:text-sm">14.2 GB · application/zip</div>
              </div>
            </div>
            <div className="w-fit shrink-0 rounded-full bg-[color-mix(in_srgb,var(--blue)_14%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--blue)]">Planning</div>
          </div>

          <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
            {["Checking account health", "Applying safe reserve", "Calculating byte ranges"].map((label, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14 * index, duration: 0.42, ease: EASE }}
                className="flex items-center gap-3 rounded-xl bg-[var(--surface-strong)] px-3.5 py-3 text-sm sm:px-4"
              >
                <motion.span
                  animate={{ rotate: index === 2 ? 360 : 0 }}
                  transition={{ duration: 1.5, repeat: index === 2 ? Infinity : 0, ease: "linear" }}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--background)]"
                >
                  {index < 2 ? <Check size={14} className="text-[var(--green)]" /> : <RefreshCw size={13} className="text-[var(--blue)]" />}
                </motion.span>
                <span className="min-w-0">{label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: EASE }}
          className="rounded-[24px] bg-[#111827] p-5 text-white shadow-[0_14px_40px_rgba(0,0,0,.16)]"
        >
          <div className="text-xs font-semibold uppercase tracking-[.14em] text-white/55">Planner decision</div>
          <div className="mt-3 text-[22px] font-semibold leading-[1.15] tracking-[-.03em] sm:text-2xl">No single account has enough safe space.</div>
          <div className="mt-4 text-sm leading-6 text-white/65">Meshly will split the original byte stream. The user-facing filename and folder stay unchanged.</div>
        </motion.div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_40px_rgba(31,41,55,.06)] sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="break-words text-sm font-semibold">camera-backup-2026.zip</div>
            <div className="mt-1 text-xs text-[var(--muted)]">14.2 GB logical file</div>
          </div>
          <div className="text-xs font-medium text-[var(--muted)]">Deterministic ranges · SHA-256 tracked</div>
        </div>

        <div className="mt-6 flex h-14 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-1 sm:mt-7 sm:h-16 sm:p-1.5">
          {allocation.map((part, index) => (
            <motion.div
              key={part.label}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${part.width}%`, opacity: 1 }}
              transition={{ delay: 0.12 * index, duration: 0.75, ease: EASE }}
              className="relative flex min-w-0 items-center justify-center overflow-hidden rounded-xl text-[11px] font-semibold text-white sm:text-xs"
              style={{ backgroundColor: part.color }}
            >
              <span className="truncate px-1.5 sm:px-2">{part.size}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 grid gap-2.5 sm:mt-5 md:grid-cols-3 md:gap-3">
          {allocation.map((part, index) => (
            <motion.div
              key={part.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + index * 0.08, duration: 0.44, ease: EASE }}
              className="rounded-2xl bg-[var(--surface-strong)] p-3.5 sm:p-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: part.color }} />{part.label}</div>
              <div className="mt-2 text-xs text-[var(--muted)]">Part {String(index + 1).padStart(2, "0")} · {part.size}</div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        {allocation.map((part, index) => (
          <motion.div
            key={part.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.46, ease: EASE }}
            className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-strong)]"><CloudUpload size={19} style={{ color: part.color }} /></div>
              <div className="text-xs font-semibold text-[var(--green)]">Resumable</div>
            </div>
            <div className="mt-4 text-sm font-semibold sm:mt-5">{part.label}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">Uploading {part.size}</div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <motion.div
                initial={{ width: "4%" }}
                animate={{ width: "100%" }}
                transition={{ delay: index * 0.12, duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{ backgroundColor: part.color }}
              />
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45, ease: EASE }}
          className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--green)_28%,var(--border))] bg-[color-mix(in_srgb,var(--green)_9%,var(--surface))] px-4 py-3 text-sm md:col-span-3"
        >
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--green)]" size={18} />
          <span>Logical file stays hidden until every physical part verifies.</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_40px_rgba(31,41,55,.06)] sm:p-7">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: EASE }} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-strong)] text-[var(--blue)]"><FileArchive size={21} /></div>
          <div className="min-w-0 flex-1">
            <div className="break-words text-sm font-semibold">camera-backup-2026.zip</div>
            <div className="mt-1 text-xs text-[var(--muted)]">14.2 GB · 3 physical parts · one logical file</div>
          </div>
        </div>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.22, type: "spring", stiffness: 280, damping: 20 }} className="flex w-fit shrink-0 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--green)_13%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--green)]">
          <CheckCircle2 size={14} /> Verified
        </motion.div>
      </motion.div>
      <div className="mt-5 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
        {["Byte order restored", "Whole-file SHA-256 matched", "Range downloads supported"].map((item, index) => (
          <motion.div key={item} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index + 0.18, duration: 0.4, ease: EASE }} className="rounded-2xl bg-[var(--surface-strong)] p-3.5 text-sm font-medium sm:p-4">
            <Check size={16} className="mb-2.5 text-[var(--green)] sm:mb-3" />{item}
          </motion.div>
        ))}
      </div>
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

  const selectStep = (next: number) => {
    setAutoPlay(false);
    setStep(Math.min(STEPS.length - 1, Math.max(0, next)));
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--background)] pb-[env(safe-area-inset-bottom)]">
      <header className="public-header sticky top-0 z-40 border-b border-[var(--border)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-8 sm:py-4">
          <Link href="/" aria-label="Back to Meshly home" className="shrink-0"><MeshlyLogo /></Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/" className="focus-ring hidden rounded-full px-3 py-2 text-sm font-medium text-[var(--muted)] lg:inline-flex">Exit demo</Link>
            <PublicHeaderTools />
            <Link href="/onboarding" className="focus-ring rounded-full bg-[var(--blue)] px-3.5 py-2.5 text-[12px] font-semibold text-white sm:px-4 sm:text-sm">
              <span className="sm:hidden">Create</span><span className="hidden sm:inline">Create workspace</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="demo-grid relative px-3 py-7 sm:px-8 sm:py-14">
        <div className="pointer-events-none absolute left-[8%] top-16 h-44 w-44 rounded-full bg-[#8ab4f8]/8 blur-3xl sm:h-52 sm:w-52" />
        <div className="pointer-events-none absolute right-[8%] top-28 h-44 w-44 rounded-full bg-[#d8a4ff]/7 blur-3xl sm:h-52 sm:w-52" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_84%,transparent)] px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[var(--green)]" /> Interactive product demo
              </div>
              <h1 className="mt-4 text-[32px] font-semibold leading-[1.05] tracking-[-.045em] sm:mt-5 sm:text-5xl">See how Meshly hides the storage plumbing.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)] sm:mt-4 sm:text-base">This is a safe simulated session. No Google account, database, or real file access is used.</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoPlay((value) => !value)}
              className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold shadow-sm"
              aria-pressed={autoPlay}
            >
              {autoPlay ? <Pause size={15} /> : <Play size={15} />}{autoPlay ? "Pause tour" : "Play tour"}
            </button>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(60,64,67,.12)] sm:rounded-[30px]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3.5 sm:px-5 sm:py-4">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ea4335]" /><span className="h-2.5 w-2.5 rounded-full bg-[#fbbc04]" /><span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" />
              <div className="ml-2 min-w-0 truncate text-xs font-semibold text-[var(--muted)] sm:ml-3">Meshly · Demo workspace</div>
              <div className="ml-auto shrink-0 rounded-full bg-[var(--surface-strong)] px-2.5 py-1 text-[10px] font-semibold text-[var(--blue)] sm:px-3 sm:text-[11px]">SIMULATED</div>
            </div>

            <div className="grid lg:min-h-[590px] lg:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-[var(--border)] bg-[var(--background)]/70 p-4 lg:block">
                <div className="rounded-2xl bg-[var(--blue-soft)] px-4 py-3 text-sm font-semibold">My Drive</div>
                <div className="mt-4 space-y-1.5 text-sm text-[var(--muted)]">
                  {["Recent", "Starred", "Shared", "Trash"].map((item) => <div key={item} className="rounded-xl px-4 py-2">{item}</div>)}
                </div>
                <div className="mt-8 text-[11px] font-semibold uppercase tracking-[.13em] text-[var(--muted)]">Demo folders</div>
                <div className="mt-3 space-y-2">
                  {["Projects", "Photos", "Backups"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"><Folder size={15} className="text-[var(--blue)]" />{item}</div>)}
                </div>
              </aside>

              <div className="flex min-w-0 flex-col p-4 sm:p-7 lg:p-9">
                <div className="flex items-start justify-between gap-4 sm:gap-5">
                  <div className="min-w-0 flex-1">
                    <AnimatePresence mode="wait">
                      <motion.div key={`${step}-copy`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0 : 0.4, ease: EASE }}>
                        <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--blue)] sm:text-xs">{current.eyebrow}</div>
                        <h2 className="mt-2 max-w-2xl text-[26px] font-semibold leading-[1.12] tracking-[-.035em] sm:text-3xl">{current.title}</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{current.body}</p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="hidden shrink-0 text-xs font-semibold text-[var(--muted)] sm:block">{step + 1} / {STEPS.length}</div>
                </div>

                <div className="mt-6 flex-1 sm:mt-8">
                  <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, y: 14, scale: 0.994 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.996 }} transition={{ duration: reduceMotion ? 0 : 0.46, ease: EASE }}>
                      <Stage step={step} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-7 pb-[max(.25rem,env(safe-area-inset-bottom))] sm:mt-8">
                  <div className="mb-4 grid grid-cols-5 gap-2">
                    {STEPS.map((_, index) => (
                      <button key={index} type="button" onClick={() => selectStep(index)} aria-label={`Go to demo step ${index + 1}`} className="group relative h-1.5 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                        <motion.span className="absolute inset-y-0 left-0 rounded-full bg-[var(--blue)]" animate={{ width: index < step ? "100%" : index === step ? "100%" : "0%" }} transition={{ duration: reduceMotion ? 0 : index === step && autoPlay ? AUTO_STEP_MS / 1000 : 0.3, ease: index === step && autoPlay ? "linear" : EASE }} />
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => selectStep(step - 1)} disabled={step === 0} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold disabled:opacity-40"><ArrowLeft size={15} /> Back</button>
                    {step < STEPS.length - 1 ? (
                      <button type="button" onClick={() => selectStep(step + 1)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--blue)] px-5 py-2 text-sm font-semibold text-white">Next <ArrowRight size={15} /></button>
                    ) : (
                      <Link href="/onboarding" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--blue)] px-5 py-2 text-sm font-semibold text-white">Build my workspace <ArrowRight size={15} /></Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 pb-2 text-[11px] text-[var(--muted)] sm:mt-7 sm:gap-x-6 sm:text-xs">
            <span className="inline-flex items-center gap-2"><Check size={14} className="text-[var(--green)]" /> No sign-in required</span>
            <span className="inline-flex items-center gap-2"><Check size={14} className="text-[var(--green)]" /> No real files touched</span>
            <span className="inline-flex items-center gap-2"><Check size={14} className="text-[var(--green)]" /> Mirrors Meshly’s real storage model</span>
          </div>
        </div>
      </section>
    </main>
  );
}
