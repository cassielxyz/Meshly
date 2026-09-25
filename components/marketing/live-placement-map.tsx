"use client";

import { Archive, CheckCircle2, FileArchive, Folder, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const targets = [
  {
    name: "Personal",
    size: "4.0 GB",
    color: "#4C8DFF",
    icon: UserRound,
    top: 24,
    path: "M206 155 C270 155 300 72 396 72",
    cx: [206, 270, 330, 396],
    cy: [155, 138, 82, 72],
    delay: 0,
  },
  {
    name: "Projects",
    size: "6.0 GB",
    color: "#42D987",
    icon: Folder,
    top: 121,
    path: "M206 155 C276 155 318 155 396 155",
    cx: [206, 278, 334, 396],
    cy: [155, 155, 155, 155],
    delay: 0.28,
  },
  {
    name: "Archive",
    size: "4.2 GB",
    color: "#F6C94C",
    icon: Archive,
    top: 218,
    path: "M206 155 C270 155 300 238 396 238",
    cx: [206, 270, 330, 396],
    cy: [155, 174, 228, 238],
    delay: 0.56,
  },
] as const;

export function LivePlacementMap() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: reduceMotion ? 0 : 0.72, ease: EASE }}
      className="placement-shell relative mx-auto w-full max-w-[680px] rounded-[34px] border border-white/12 bg-white/[.045] p-5 shadow-[0_32px_110px_rgba(0,0,0,.3)] backdrop-blur-xl sm:p-8"
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 text-left">
          <div className="text-[11px] font-semibold uppercase tracking-[.2em] text-white/45 sm:text-xs">Live placement map</div>
          <div className="mt-2 truncate text-base font-semibold tracking-[-.02em] text-white sm:text-lg">camera-backup-2026.zip <span className="text-white/55">· 14.2 GB</span></div>
        </div>
        <div className="shrink-0 rounded-full border border-white/12 bg-white/[.055] px-4 py-2 text-[11px] font-semibold tracking-[.05em] text-white/58 shadow-inner">AUTO</div>
      </div>

      <div className="relative mt-7 h-[326px] overflow-hidden rounded-[28px] border border-white/9 bg-black/[.11] sm:h-[342px]">
        <div className="placement-map-grid pointer-events-none absolute inset-0 opacity-45" />
        <div className="pointer-events-none absolute left-[19%] top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[#4285F4]/10 blur-[45px]" />
        <div className="pointer-events-none absolute right-[5%] top-[18%] h-40 w-40 rounded-full bg-[#34A853]/7 blur-[55px]" />

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 640 310" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="meshlyFlowGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <motion.path
            d="M28 155 C64 155 86 155 108 155"
            fill="none"
            stroke="rgba(102,163,255,.72)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="8 10"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
            className="placement-flow-path"
          />
          <circle cx="27" cy="155" r="5" fill="#66A3FF" opacity=".86" filter="url(#meshlyFlowGlow)" />

          {targets.map((target) => (
            <motion.path
              key={target.name}
              d={target.path}
              fill="none"
              stroke={target.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="8 10"
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0.15 }}
              whileInView={{ pathLength: 1, opacity: 0.78 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: reduceMotion ? 0 : 0.25 + target.delay, duration: reduceMotion ? 0 : 0.85, ease: EASE }}
              className="placement-flow-path"
            />
          ))}

          {targets.map((target) => (
            <g key={`${target.name}-pulse`}>
              <circle cx="396" cy={target.cy[target.cy.length - 1]} r="5" fill={target.color} opacity=".9" filter="url(#meshlyFlowGlow)" />
              <motion.circle
                r="4.5"
                fill={target.color}
                filter="url(#meshlyFlowGlow)"
                initial={false}
                animate={reduceMotion ? { cx: 396, cy: target.cy[target.cy.length - 1], opacity: 0.9 } : { cx: [...target.cx], cy: [...target.cy], opacity: [0, 1, 1, 0] }}
                transition={reduceMotion ? { duration: 0 } : { duration: 2.35, delay: 1 + target.delay, repeat: Infinity, repeatDelay: 0.45, ease: "linear" }}
              />
            </g>
          ))}
        </svg>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ delay: reduceMotion ? 0 : 0.12, duration: reduceMotion ? 0 : 0.52, ease: EASE }}
          className="absolute left-[8%] top-1/2 z-10 flex -translate-y-1/2 items-center gap-3 rounded-2xl border border-white/70 bg-white px-4 py-3 text-[#172033] shadow-[0_12px_34px_rgba(0,0,0,.18),0_0_30px_rgba(76,141,255,.12)] sm:left-[10%]"
        >
          <FileArchive size={19} className="text-[#4C8DFF]" />
          <span className="text-sm font-bold tracking-[-.02em]">14.2 GB</span>
        </motion.div>

        <div className="absolute right-4 top-0 h-full w-[47%] min-w-[210px] sm:right-6 sm:w-[43%]">
          {targets.map((target, index) => {
            const Icon = target.icon;
            return (
              <motion.div
                key={target.name}
                initial={reduceMotion ? false : { opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ delay: reduceMotion ? 0 : 0.55 + target.delay, duration: reduceMotion ? 0 : 0.55, ease: EASE }}
                className="absolute left-0 flex h-[72px] w-full items-center rounded-[22px] border border-white/12 bg-white/[.065] px-4 shadow-[0_10px_28px_rgba(0,0,0,.12)] backdrop-blur-md sm:px-5"
                style={{ top: target.top }}
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-[5px] rounded-l-[22px]"
                  style={{ backgroundColor: target.color }}
                  animate={reduceMotion ? undefined : { opacity: [0.65, 1, 0.65] }}
                  transition={{ duration: 2.2, delay: index * 0.22, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[.035]" style={{ color: target.color }}><Icon size={20} /></div>
                  <span className="truncate text-sm font-semibold tracking-[-.01em] text-white sm:text-[15px]">{target.name}</span>
                </div>
                <span className="ml-3 shrink-0 text-xs font-medium tabular-nums text-white/48 sm:text-[13px]">{target.size}</span>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: reduceMotion ? 0 : 1.3, duration: reduceMotion ? 0 : 0.5, ease: EASE }}
          className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-[#81c995]/18 bg-[#81c995]/9 px-3 py-1.5 text-[10px] font-semibold text-[#b7e1c1] sm:left-6 sm:text-[11px]"
        >
          <CheckCircle2 size={13} /> Split ranges tracked · SHA-256 ready
        </motion.div>
      </div>
    </motion.div>
  );
}
