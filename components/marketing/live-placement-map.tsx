"use client";

import { CheckCircle2, Cloud, FileArchive, LockKeyhole, Route, ShieldCheck } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

const accounts = [
  { name: "Personal", free: "4.2 GB free", color: "#4C8DFF", selected: false },
  { name: "Projects", free: "18.6 GB free", color: "#42D987", selected: true },
  { name: "Backup", free: "12.1 GB free", color: "#F6C94C", selected: false },
] as const;

export function LivePlacementMap() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const raw = useMotionValue(0);
  const progress = useSpring(raw, { stiffness: 44, damping: 24, mass: 1.2, restDelta: 0.0004, restSpeed: 0.0015 });

  useEffect(() => {
    const root = shellRef.current?.closest("[data-placement-scroll-root]") as HTMLElement | null;
    const fallback = shellRef.current?.closest("#architecture") as HTMLElement | null;
    const section = root ?? fallback;
    if (!section || reduceMotion) {
      raw.set(reduceMotion ? 1 : 0);
      return;
    }

    let raf = 0;
    let top = 0;
    let travel = 1;
    let headerOffset = 0;
    const measure = () => {
      const rect = section.getBoundingClientRect();
      const vh = Math.max(1, document.documentElement.clientHeight || window.innerHeight);
      top = window.scrollY + rect.top;
      headerOffset = window.innerWidth < 1024 ? 72 : 0;
      travel = Math.max(1, section.offsetHeight - vh + headerOffset);
    };
    const update = () => {
      raf = 0;
      raw.set(Math.min(1, Math.max(0, (window.scrollY - top + headerOffset) / travel)));
    };
    const requestUpdate = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    const resize = () => {
      measure();
      requestUpdate();
    };
    measure();
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [raw, reduceMotion]);

  const sourceX = useTransform(progress, [0, 0.24], [0, 126]);
  const sourceOpacity = useTransform(progress, [0, 0.32], [1, 0.32]);
  const encryptScale = useTransform(progress, [0.14, 0.3], [0.72, 1]);
  const encryptOpacity = useTransform(progress, [0.1, 0.28], [0.18, 1]);
  const routeLength = useTransform(progress, [0.27, 0.64], [0, 1]);
  const routeOpacity = useTransform(progress, [0.25, 0.52], [0.18, 0.95]);
  const selectedGlow = useTransform(progress, [0.48, 0.68, 1], [0.1, 1, 0.55]);
  const uploadWidth = useTransform(progress, [0.58, 0.88], ["3%", "100%"]);
  const verifyOpacity = useTransform(progress, [0.82, 0.95], [0, 1]);
  const verifyY = useTransform(progress, [0.82, 0.95], [10, 0]);
  const bottomProgress = useTransform(progress, [0.03, 0.96], [0, 1]);

  return (
    <div ref={shellRef} className="placement-shell relative mx-auto w-full max-w-[690px] rounded-[30px] border border-white/12 bg-white/[.045] p-4 shadow-[0_28px_90px_rgba(0,0,0,.28)] backdrop-blur-xl sm:rounded-[34px] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 text-left">
          <div className="text-[10px] font-semibold uppercase tracking-[.19em] text-white/45 sm:text-xs">Secure placement · live</div>
          <div className="mt-2 truncate text-[15px] font-semibold tracking-[-.02em] text-white sm:text-lg">camera-backup-2026.zip <span className="text-white/55">· 8.4 GB</span></div>
        </div>
        <div className="shrink-0 rounded-full border border-white/12 bg-white/[.055] px-3 py-2 text-[10px] font-semibold tracking-[.05em] text-white/58 sm:px-4 sm:text-[11px]">SCROLL</div>
      </div>

      <div className="relative mt-5 min-h-[360px] overflow-hidden rounded-[24px] border border-white/9 bg-black/[.11] p-4 sm:mt-7 sm:min-h-[390px] sm:rounded-[28px] sm:p-6">
        <div className="placement-map-grid pointer-events-none absolute inset-0 opacity-45" />
        <div className="pointer-events-none absolute left-[15%] top-[22%] h-36 w-36 rounded-full bg-[#4285F4]/10 blur-[45px]" />
        <div className="pointer-events-none absolute right-[8%] bottom-[10%] h-44 w-44 rounded-full bg-[#b58cff]/8 blur-[55px]" />

        <div className="relative z-10 grid gap-4 sm:grid-cols-[.9fr_1.1fr] sm:items-center">
          <div className="relative min-h-[150px] sm:min-h-[280px]">
            <motion.div style={reduceMotion ? undefined : { x: sourceX, opacity: sourceOpacity }} className="absolute left-1 top-5 flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-3 py-2.5 text-[#172033] shadow-[0_12px_34px_rgba(0,0,0,.18)] sm:top-20 sm:px-4 sm:py-3">
              <FileArchive size={18} className="text-[#4C8DFF]" />
              <div><div className="text-xs font-bold sm:text-sm">8.4 GB file</div><div className="text-[9px] text-[#667085] sm:text-[10px]">original bytes</div></div>
            </motion.div>

            <motion.div style={{ opacity: reduceMotion ? 1 : encryptOpacity, scale: reduceMotion ? 1 : encryptScale }} className="absolute bottom-3 left-1 right-1 rounded-[22px] border border-[#8ab4f8]/20 bg-[#111c31]/92 p-3 text-white shadow-[0_18px_44px_rgba(0,0,0,.22)] sm:bottom-20 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#8ab4f8]/12 text-[#9ec1ff]"><LockKeyhole size={18} /></div>
                <div><div className="text-xs font-semibold sm:text-sm">Encrypt first</div><div className="mt-0.5 text-[10px] text-white/48 sm:text-[11px]">AES-256-GCM · per-file key</div></div>
              </div>
            </motion.div>
          </div>

          <div className="relative">
            <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.15em] text-white/42 sm:text-[11px]"><span>Google Drives</span><span className="normal-case tracking-normal text-white/32">one file → one account</span></div>
            <svg aria-hidden="true" className="pointer-events-none absolute -left-16 top-7 hidden h-[238px] w-24 sm:block" viewBox="0 0 96 238" preserveAspectRatio="none">
              <motion.path d="M4 112 C42 112 44 112 92 112" fill="none" stroke="#42D987" strokeWidth="2.5" strokeDasharray="7 8" strokeLinecap="round" style={{ pathLength: reduceMotion ? 1 : routeLength, opacity: reduceMotion ? 0.9 : routeOpacity }} />
            </svg>
            <div className="space-y-2.5">
              {accounts.map((account) => (
                <motion.div key={account.name} className="relative overflow-hidden rounded-[20px] border border-white/12 bg-white/[.065] p-3.5 backdrop-blur-md sm:p-4" animate={account.selected && !reduceMotion ? { scale: [1, 1.015, 1] } : undefined} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
                  {account.selected && <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[20px] border border-[#42D987]/50" style={{ opacity: reduceMotion ? 0.65 : selectedGlow }} />}
                  <div className="relative flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[.045]" style={{ color: account.color }}><Cloud size={18} /></div>
                    <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white">{account.name}</div><div className="mt-0.5 text-[10px] text-white/42 sm:text-[11px]">{account.free}</div></div>
                    {account.selected ? <div className="flex items-center gap-1.5 rounded-full bg-[#42D987]/12 px-2.5 py-1 text-[9px] font-semibold text-[#a7efc5] sm:text-[10px]"><Route size={11} /> Auto choice</div> : <div className="text-[9px] text-white/30 sm:text-[10px]">available</div>}
                  </div>
                  {account.selected && <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/7"><motion.div className="h-full rounded-full bg-[#42D987]" style={{ width: reduceMotion ? "100%" : uploadWidth }} /></div>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <motion.div style={{ opacity: reduceMotion ? 1 : verifyOpacity, y: reduceMotion ? 0 : verifyY }} className="relative z-10 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#81c995]/18 bg-[#81c995]/9 px-3.5 py-3 text-[10px] font-semibold text-[#b7e1c1] sm:text-[11px]">
          <span className="inline-flex items-center gap-2"><CheckCircle2 size={13} /> Ciphertext stored</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck size={13} /> Integrity verified</span>
          <span className="ml-auto text-white/40">original filename stays in Meshly</span>
        </motion.div>

        <motion.div aria-hidden="true" className="absolute inset-x-4 bottom-0 h-px origin-left bg-gradient-to-r from-[#4C8DFF] via-[#42D987] to-[#B58CFF] sm:inset-x-6" style={{ scaleX: reduceMotion ? 1 : bottomProgress }} />
      </div>
    </div>
  );
}
