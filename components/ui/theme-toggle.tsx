"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

const STORAGE_KEY = "meshly-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const next: Theme = saved === "dark" || saved === "light"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    applyTheme(next);
  }, []);

  function toggle() {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new CustomEvent("meshly:theme", { detail: next }));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={`focus-ring inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_86%,transparent)] text-[var(--foreground)] shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-strong)] ${compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-10 w-10"}`}
    >
      <Moon className="dark:hidden" size={compact ? 15 : 17} />
      <Sun className="hidden dark:block" size={compact ? 15 : 17} />
    </button>
  );
}
