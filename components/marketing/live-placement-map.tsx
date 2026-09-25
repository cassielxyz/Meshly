"use client";

import { Archive, CheckCircle2, FileArchive, Folder, UserRound } from "lucide-react";
import {
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

type ChunkMotion = {
  pathLength: MotionValue<number>;
  pathOpacity: MotionValue<number>;
  left: MotionValue<string>;
  top: MotionValue<string>;
  opacity: MotionValue<number>;
  scale: MotionValue<number>;
  cardOpacity: MotionValue<number>;
  cardX: MotionValue<number>;
  cardGlow: MotionValue<number>;
};

function useChunkMotion(
  progress: MotionValue<number>,
  start: number,
  end: number,
  targetTop: string,
): ChunkMotion {
  const pathLength = useTransform(progress, [start - 0.035, end], [0, 1]);
  const pathOpacity = useTransform(progress, [start - 0.04, start, end], [0.14, 0.52, 0.9]);
  const left = useTransform(progress, [start, end], ["34.5%", "56.5%"]);
  const top = useTransform(progress, [start, end], ["50%", targetTop]);
  const opacity = useTransform(progress, [start - 0.045, start, end, end + 0.065], [0, 1, 1, 0]);
  const scale = useTransform(progress, [start, end], [0.82, 1]);
  const cardOpacity = useTransform(progress, [start - 0.03, end], [0.58, 1]);
  const cardX = useTransform(progress, [start - 0.03, end], [10, 0]);
  const cardGlow = useTransform(progress, [end - 0.045, end, end + 0.07], [0, 1, 0.45]);
  return { pathLength, pathOpacity, left, top, opacity, scale, cardOpacity, cardX, cardGlow };
}

const destinations = [
  { name: "Personal", size: "4.0 GB", color: "#4C8DFF", icon: UserRound, top: 24 },
  { name: "Projects", size: "6.0 GB", color: "#42D987", icon: Folder, top: 121 },
  { name: "Archive", size: "4.2 GB", color: "#F6C94C", icon: Archive, top: 218 },
] as const;

export function LivePlacementMap() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const rawProgress = useMotionValue(0);
  const progress = useSpring(rawProgress, { stiffness: 150, damping: 30, mass: 0.34 });

  useEffect(() => {
    const section = shellRef.current?.closest("#architecture") as HTMLElement | null;
    if (!section || reduceMotion) {
      rawProgress.set(reduceMotion ? 1 : 0);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      const next = Math.min(1, Math.max(0, -rect.top / travel));
      rawProgress.set(next);
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rawProgress, reduceMotion]);

  const trunkLength = useTransform(progress, [0.06, 0.23], [0, 1]);
  const trunkOpacity = useTransform(progress, [0.04, 0.13, 0.23], [0.12, 0.72, 0.95]);
  const splitterOpacity = useTransform(progress, [0.17, 0.24, 0.78], [0, 1, 1]);
  const splitterScale = useTransform(progress, [0.17, 0.24], [0.45, 1]);
  const sourceOpacity = useTransform(progress, [0, 0.22, 0.37, 0.82], [1, 1, 0.46, 0.28]);
  const sourceScale = useTransform(progress, [0, 0.22, 0.37], [1, 1, 0.94]);
  const splitLabelOpacity = useTransform(progress, [0.16, 0.26, 0.72, 0.82], [0, 1, 1, 0]);
  const verifyOpacity = useTransform(progress, [0.76, 0.9, 1], [0, 1, 1]);
  const verifyY = useTransform(progress, [0.76, 0.9], [8, 0]);
  const progressScale = useTransform(progress, [0.04, 0.94], [0, 1]);

  const personal = useChunkMotion(progress, 0.25, 0.49, "22%" );
  const projects = useChunkMotion(progress, 0.32, 0.59, "50%" );
  const archive = useChunkMotion(progress, 0.39, 0.69, "78%" );
  const motions = [personal, projects, archive] as const;

  const pathData = [
    "M220 155 C270 155 292 72 356 72",
    "M220 155 C276 155 308 155 356 155",
    "M220 155 C270 155 292 238 356 238",
  ] as const;

  return (
    <div
      ref={shellRef}
      className="placement-shell relative mx-auto w-full max-w-[680px] rounded-[34px] border border-white/12 bg-white/[.045] p-5 shadow-[0_32px_110px_rgba(0,0,0,.3)] backdrop-blur-xl sm:p-8"
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 text-left">
          <div className="text-[11px] font-semibold uppercase tracking-[.2em] text-white/45 sm:text-xs">Live placement map</div>
          <div className="mt-2 truncate text-base font-semibold tracking-[-.02em] text-white sm:text-lg">
            camera-backup-2026.zip <span className="text-white/55">· 14.2 GB</span>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-white/12 bg-white/[.055] px-4 py-2 text-[11px] font-semibold tracking-[.05em] text-white/58 shadow-inner">
          SCROLL
        </div>
      </div>

      <div className="relative mt-7 h-[326px] overflow-hidden rounded-[28px] border border-white/9 bg-black/[.11] sm:h-[342px]">
        <div className="placement-map-grid pointer-events-none absolute inset-0 opacity-45" />
        <div className="pointer-events-none absolute left-[18%] top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[#4285F4]/10 blur-[45px]" />
        <div className="pointer-events-none absolute right-[5%] top-[18%] h-40 w-40 rounded-full bg-[#34A853]/7 blur-[55px]" />

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 640 310" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="meshlyScrollGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <motion.path
            d="M128 155 C162 155 190 155 220 155"
            fill="none"
            stroke="rgba(102,163,255,.88)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeDasharray="8 10"
            style={{ pathLength: reduceMotion ? 1 : trunkLength, opacity: reduceMotion ? 0.95 : trunkOpacity }}
          />

          {destinations.map((destination, index) => (
            <motion.path
              key={destination.name}
              d={pathData[index]}
              fill="none"
              stroke={destination.color}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="8 10"
              style={{
                pathLength: reduceMotion ? 1 : motions[index].pathLength,
                opacity: reduceMotion ? 0.86 : motions[index].pathOpacity,
              }}
            />
          ))}

          <motion.circle
            cx="220"
            cy="155"
            r="6"
            fill="#D8E7FF"
            filter="url(#meshlyScrollGlow)"
            style={{ opacity: reduceMotion ? 1 : splitterOpacity, scale: reduceMotion ? 1 : splitterScale, transformOrigin: "220px 155px" }}
          />
        </svg>

        <motion.div
          className="absolute left-[12%] top-1/2 z-10 flex -translate-y-1/2 items-center gap-3 rounded-2xl border border-white/70 bg-white px-4 py-3 text-[#172033] shadow-[0_12px_34px_rgba(0,0,0,.18),0_0_30px_rgba(76,141,255,.12)] sm:left-[13%]"
          style={{ opacity: reduceMotion ? 0.3 : sourceOpacity, scale: reduceMotion ? 0.94 : sourceScale }}
        >
          <FileArchive size={19} className="text-[#4C8DFF]" />
          <span className="text-sm font-bold tracking-[-.02em]">14.2 GB</span>
        </motion.div>

        <motion.div
          className="absolute left-[34.5%] top-[42%] z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-[#111c31]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-white/55 backdrop-blur"
          style={{ opacity: reduceMotion ? 0 : splitLabelOpacity }}
        >
          split into 3 ranges
        </motion.div>

        {destinations.map((destination, index) => (
          <motion.div
            key={`${destination.name}-chunk`}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/20 bg-[#111827]/95 px-2.5 py-1.5 text-[10px] font-bold tabular-nums shadow-[0_8px_22px_rgba(0,0,0,.24)] backdrop-blur-sm sm:text-[11px]"
            style={{
              left: reduceMotion ? "56.5%" : motions[index].left,
              top: reduceMotion ? ["22%", "50%", "78%"][index] : motions[index].top,
              opacity: reduceMotion ? 0 : motions[index].opacity,
              scale: reduceMotion ? 1 : motions[index].scale,
              color: destination.color,
            }}
          >
            {destination.size}
          </motion.div>
        ))}

        <div className="absolute right-4 top-0 h-full w-[47%] min-w-[210px] sm:right-6 sm:w-[43%]">
          {destinations.map((destination, index) => {
            const Icon = destination.icon;
            return (
              <motion.div
                key={destination.name}
                className="absolute left-0 flex h-[72px] w-full items-center rounded-[22px] border border-white/12 bg-white/[.065] px-4 shadow-[0_10px_28px_rgba(0,0,0,.12)] backdrop-blur-md sm:px-5"
                style={{
                  top: destination.top,
                  opacity: reduceMotion ? 1 : motions[index].cardOpacity,
                  x: reduceMotion ? 0 : motions[index].cardX,
                  boxShadow: reduceMotion
                    ? `0 10px 28px rgba(0,0,0,.12), 0 0 24px ${destination.color}22`
                    : undefined,
                }}
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-[5px] rounded-l-[22px]"
                  style={{
                    backgroundColor: destination.color,
                    opacity: reduceMotion ? 1 : motions[index].cardGlow,
                  }}
                />
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[.035]" style={{ color: destination.color }}>
                    <Icon size={20} />
                  </div>
                  <span className="truncate text-sm font-semibold tracking-[-.01em] text-white sm:text-[15px]">{destination.name}</span>
                </div>
                <span className="ml-3 shrink-0 text-xs font-medium tabular-nums text-white/48 sm:text-[13px]">{destination.size}</span>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-[#81c995]/18 bg-[#81c995]/9 px-3 py-1.5 text-[10px] font-semibold text-[#b7e1c1] sm:left-6 sm:text-[11px]"
          style={{ opacity: reduceMotion ? 1 : verifyOpacity, y: reduceMotion ? 0 : verifyY }}
        >
          <CheckCircle2 size={13} /> 3 ranges placed · SHA-256 verified
        </motion.div>

        <motion.div
          aria-hidden="true"
          className="absolute inset-x-4 bottom-0 h-px origin-left bg-gradient-to-r from-[#4C8DFF] via-[#B58CFF] to-[#F6A6D8] sm:inset-x-6"
          style={{ scaleX: reduceMotion ? 1 : progressScale }}
        />
      </div>
    </div>
  );
}
