import Link from "next/link";
import { MeshlyLogo } from "@/components/brand/meshly-logo";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="gradient-mesh min-h-screen grid place-items-center p-6">
      <section className="mesh-card w-full max-w-[460px] p-8 sm:p-10">
        <MeshlyLogo className="mb-8" />
        <h1 className="text-3xl font-semibold tracking-[-.035em]">Sign in to Meshly</h1>
        <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">Connect your Google accounts and manage their storage as one clean workspace.</p>
        <a href="/api/auth/google/start" className="focus-ring mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--border)] bg-white px-5 font-medium shadow-sm transition hover:bg-[#f8fafd]">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-[#dadce0] font-bold text-[#4285f4]">G</span>
          Continue with Google
        </a>
        <div className="my-7 h-px bg-[var(--border)]" />
        <p className="text-xs leading-5 text-[var(--muted)]">Meshly requests only the permissions required for the storage mode you choose. You can disconnect an account at any time.</p>
        <div className="mt-7 flex gap-5 text-sm text-[var(--blue)]"><Link href="/help">Help</Link><Link href="/privacy">Privacy</Link><Link href="/">Back home</Link></div>
      </section>
    </main>
  );
}
