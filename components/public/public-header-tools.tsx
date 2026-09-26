"use client";

import { Github } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function PublicHeaderTools({ className = "" }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-1.5 sm:gap-2 ${className}`} aria-label="Public page controls">
      <a
        href="https://github.com/cassielxyz/Meshly"
        target="_blank"
        rel="noreferrer"
        className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] text-[var(--foreground)] shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-strong)] sm:h-9 sm:w-9"
        aria-label="View Meshly source on GitHub"
        title="View source on GitHub"
      >
        <Github size={15} className="sm:h-4 sm:w-4" />
      </a>
      <ThemeToggle compact />
    </div>
  );
}
