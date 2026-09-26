"use client";

import { Github } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const publicRoutes = ["/", "/demo", "/login", "/onboarding"] as const;
const subscribeHydration = () => () => {};

function isPublicPath(pathname: string) {
  return publicRoutes.some((route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)));
}

function findHeaderActionTarget() {
  const explicit = document.querySelector<HTMLElement>("[data-meshly-header-actions]");
  if (explicit) return explicit;

  const header = document.querySelector("header");
  const inner = header?.firstElementChild;
  const fallback = inner?.lastElementChild;
  return fallback instanceof HTMLElement ? fallback : null;
}

function HeaderTools() {
  return (
    <div className="flex shrink-0 items-center gap-2" aria-label="Public page controls">
      <a
        href="https://github.com/cassielxyz/Meshly"
        target="_blank"
        rel="noreferrer"
        className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] text-[var(--foreground)] shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-strong)]"
        aria-label="View Meshly source on GitHub"
        title="View source on GitHub"
      >
        <Github size={16} />
      </a>
      <ThemeToggle compact />
    </div>
  );
}

export function PublicSiteChrome() {
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const headerTarget = hydrated && isPublic ? findHeaderActionTarget() : null;

  useEffect(() => {
    document.body.dataset.meshlyPublic = isPublic ? "true" : "false";
    return () => {
      delete document.body.dataset.meshlyPublic;
    };
  }, [isPublic]);

  if (!isPublic) return null;

  return (
    <>
      {headerTarget ? createPortal(<HeaderTools />, headerTarget) : null}

      <footer className="public-credit-footer border-t border-[var(--border)] bg-[var(--background)] px-5 py-10 text-[var(--muted)] sm:px-8 sm:py-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="public-credit-quote max-w-2xl text-[var(--foreground)]">
            “Crafted with care, curiosity, and a little obsession.”
          </p>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--muted)]">— cassiel</div>
          <a
            href="https://github.com/cassielxyz"
            target="_blank"
            rel="noreferrer"
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-strong)]"
            aria-label="Open cassiel GitHub profile"
          >
            <Github size={15} />
            github.com/cassielxyz
          </a>
        </div>
      </footer>
    </>
  );
}
