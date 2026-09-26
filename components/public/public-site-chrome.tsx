"use client";

import { Github } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

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
  );
}
