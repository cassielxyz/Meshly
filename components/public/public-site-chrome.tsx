"use client";

import { Github } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const publicRoutes = ["/", "/demo", "/login", "/onboarding"] as const;

function isPublicPath(pathname: string) {
  return publicRoutes.some((route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)));
}

export function PublicSiteChrome() {
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    document.body.dataset.meshlyPublic = isPublic ? "true" : "false";
    return () => {
      delete document.body.dataset.meshlyPublic;
    };
  }, [isPublic]);

  if (!isPublic) return null;

  return (
    <>
      <div className="fixed right-4 top-[76px] z-[65] flex items-center gap-2 sm:right-6 md:top-3 md:right-[184px]">
        <a
          href="https://github.com/cassielxyz/Meshly"
          target="_blank"
          rel="noreferrer"
          className="focus-ring inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_86%,transparent)] px-3 text-xs font-semibold text-[var(--foreground)] shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-strong)]"
          aria-label="View Meshly source on GitHub"
          title="View source on GitHub"
        >
          <Github size={16} />
          <span className="hidden lg:inline">View source</span>
        </a>
        <ThemeToggle compact />
      </div>

      <footer className="public-credit-footer border-t border-[var(--border)] bg-[var(--background)] px-5 py-5 text-[var(--muted)] sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs sm:flex-row sm:text-sm">
          <span>Built with curiosity, shipped with care — cassiel.</span>
          <a
            href="https://github.com/cassielxyz"
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex items-center gap-2 rounded-full px-2 py-1 font-semibold text-[var(--foreground)] transition-opacity hover:opacity-70"
            aria-label="Open cassiel GitHub profile"
          >
            <Github size={16} />
            github.com/cassielxyz
          </a>
        </div>
      </footer>
    </>
  );
}
