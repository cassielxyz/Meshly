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
  const pathLength = useTransform(progress, [start - 0.055, end], [0, 1]);
  const pathOpacity = useTransform(progress, [start - 0.06, start, end], [0.1, 0.48, 0.9]);
  const left = useTransform(progress, [start, end], ["34.5%", "56.5%"]);
  const top = useTransform(progress, [start, end], ["50%", targetTop]);
  const opacity = useTransform(progress, [start - 0.07, start, end, end + 0.085], [0, 1, 1, 0]);
  const scale = useTransform(progress, [start, end], [0.78, 1]);
  const cardOpacity = useTransform(progress, [start - 0.055, end], [0.52, 1]);
  const cardX = useTransform(progress, [start - 0.055, end], [14, 0]);
  const cardGlow = useTransform(progress, [end - 0.07, end, end + 0.09], [0, 1, 0.42]);
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
  const progress = useSpring(rawProgress, {
    stiffness: 44,
    damping: 24,
    mass: 1.2,
    restDelta: 0.0004,
    restSpeed: 0.0015,
  });

  useEffect(() => {
    const scrollRoot = shellRef.current?.closest("[data-placement-scroll-root]") as HTMLElement | null;
    const fallback = shellRef.current?.closest("#architecture") as HTMLElement | null;
    const section = scrollRoot ?? fallback;

    if (!section || reduceMotion) {
      rawProgress.set(reduceMotion ? 1 : 0);
      return;
    }

    let frame = 0;
    let sectionTop = 0;
    let travel = 1;
    let headerOffset = 0;

    const measure = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = Math.max(1, document.documentElement.clientHeight || window.innerHeight);
      sectionTop = window.scrollY + rect.top;
      headerOffset = window.innerWidth < 1024 ? 72 : 0;
      travel = Math.max(1, section.offsetHeight - viewportHeight + headerOffset);
    };

    const update = () => {
      frame = 0;
      const next = Math.min(1, Math.max(0, (window.scrollY - sectionTop + headerOffset) / travel));
      rawProgress.set(next);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const handleResize = () => {
      measure();
      requestUpdate();
    };

    measure();
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rawProgress, reduceMotion]);

  const trunkLength = useTransform(progress, [0.055, 0.235], [0, 1]);
  const trunkOpacity = useTransform(progress, [0.035, 0.13, 0.235], [0.1, 0.7, 0.95]);
  const splitterOpacity = useTransform(progress, [0.16, 0.245, 0.8], [0, 1, 1]);
  const splitterScale = useTransform(progress, [0.16, 0.245], [0.42, 1]);
  const sourceOpacity = useTransform(progress, [0, 0.24, 0.42, 0.84], [1, 1, 0.5, 0.3]);
  const sourceScale = useTransform(progress, [0, 0.24, 0.42], [1, 1, 0.95]);
  const splitLabelOpacity = useTransform(progress, [0.15, 0.27, 0.74, 0.84], [0, 1, 1, 0]);
  const verifyOpacity = useTransform(progress, [0.79, 0.93, 1], [0, 1, 1]);
  const verifyY = useTransform(progress, [0.79, 0.93], [9, 0]);
  const progressScale = useTransform(progress, [0.03, 0.95], [0, 1]);

  const personal = useChunkMotion(progress, 0.22, 0.52, "22%");
  const projects = useChunkMotion(progress, 0.29, 0.63, "50%");
  const archive = useChunkMotion(progress, 0.36, 0.74, "78%");
  const motions = [personal, projects, archive] as const;

  const pathData = [
    "M220 155 C270 155 292 72 356 72",
    "M220 155 C276 155 308 155 356 155",
    "M220 155 C270 155 292 238 356 238",
  ] as const;

  return (
    <div
      ref={shellRef}
      className="placement-shell relative mx-auto w-full max-w-[680px] rounded-[30px] border border-white/12 bg-white/[.045] p-4 shadow-[0_28px_90px_rgba(0,0,0,.28)] backdrop-blur-xl sm:rounded-[34px] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4 sm:gap-5">
        <div className="min-w-0 text-left">
          <div className="text-[10px] font-semibold uppercase tracking-[.19em] text-white/45 sm:text-xs">Live placement map</div>
          <div className="mt-2 truncate text-[15px] font-semibold tracking-[-.02em] text-white sm:text-lg">
            camera-backup-2026.zip <span className="text-white/55">· 14.2 GB</span>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-white/12 bg-white/[.055] px-3 py-2 text-[10px] font-semibold tracking-[.05em] text-white/58 shadow-inner sm:px-4 sm:text-[11px]">
          SCROLL
        </div>
      </div>

      <div className="relative mt-5 h-[300px] overflow-hidden rounded-[24px] border border-white/9 bg-black/[.11] sm:mt-7 sm:h-[342px] sm:rounded-[28px]">
        <div className="placement-map-grid pointer-events-none absolute inset-0 opacity-45" />
        <div className="pointer-events-none absolute left-[18%] top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[#4285F4]/10 blur-[45px]" />
        <div className="pointer-events-none absolute right-[5%] top-[18%] h-40 w-40 rounded-full bg-[#b58cff]/8 blur-[55px]" />

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
          className="absolute left-[9%] top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 rounded-2xl border border-white/70 bg-white px-3 py-2.5 text-[#172033] shadow-[0_12px_34px_rgba(0,0,0,.18),0_0_30px_rgba(76,141,255,.12)] sm:left-[13%] sm:gap-3 sm:px-4 sm:py-3"
          style={{ opacity: reduceMotion ? 0.3 : sourceOpacity, scale: reduceMotion ? 0.94 : sourceScale }}
        >
          <FileArchive size={17} className="text-[#4C8DFF] sm:h-[19px] sm:w-[19px]" />
          <span className="text-xs font-bold tracking-[-.02em] sm:text-sm">14.2 GB</span>
        </motion.div>

        <motion.div
          className="absolute left-[34.5%] top-[42%] z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-[#111c31]/90 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[.11em] text-white/55 backdrop-blur sm:px-3 sm:text-[10px]"
          style={{ opacity: reduceMotion ? 0 : splitLabelOpacity }}
        >
          split into 3 ranges
        </motion.div>

        {destinations.map((destination, index) => (
          <motion.div
            key={`${destination.name}-chunk`}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/20 bg-[#111827]/95 px-2 py-1.5 text-[9px] font-bold tabular-nums shadow-[0_8px_22px_rgba(0,0,0,.24)] backdrop-blur-sm sm:px-2.5 sm:text-[11px]"
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

        <div className="absolute right-3 top-0 h-full w-[49%] min-w-[184px] sm:right-6 sm:w-[43%] sm:min-w-[210px]">
          {destinations.map((destination, index) => {
            const Icon = destination.icon;
            return (
              <motion.div
                key={destination.name}
                className="absolute left-0 flex h-[66px] w-full items-center rounded-[20px] border border-white/12 bg-white/[.065] px-3 shadow-[0_10px_28px_rgba(0,0,0,.12)] backdrop-blur-md sm:h-[72px] sm:rounded-[22px] sm:px-5"
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
                  className="absolute inset-y-0 left-0 w-[5px] rounded-l-[20px] sm:rounded-l-[22px]"
                  style={{
                    backgroundColor: destination.color,
                    opacity: reduceMotion ? 1 : motions[index].cardGlow,
                  }}
                />
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[.035] sm:h-9 sm:w-9" style={{ color: destination.color }}>
                    <Icon size={18} />
                  </div>
                  <span className="truncate text-[13px] font-semibold tracking-[-.01em] text-white sm:text-[15px]">{destination.name}</span>
                </div>
                <span className="ml-2 shrink-0 text-[11px] font-medium tabular-nums text-white/48 sm:ml-3 sm:text-[13px]">{destination.size}</span>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-[#81c995]/18 bg-[#81c995]/9 px-2.5 py-1.5 text-[9px] font-semibold text-[#b7e1c1] sm:bottom-4 sm:left-6 sm:px-3 sm:text-[11px]"
          style={{ opacity: reduceMotion ? 1 : verifyOpacity, y: reduceMotion ? 0 : verifyY }}
        >
          <CheckCircle2 size={12} /> 3 ranges placed · SHA-256 verified
        </motion.div>

        <motion.div
          aria-hidden="true"
          className="absolute inset-x-3 bottom-0 h-px origin-left bg-gradient-to-r from-[#4C8DFF] via-[#B58CFF] to-[#F6A6D8] sm:inset-x-6"
          style={{ scaleX: reduceMotion ? 1 : progressScale }}
        />
      </div>
    </div>
  );
}
