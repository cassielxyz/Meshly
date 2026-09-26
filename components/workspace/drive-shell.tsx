"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  CloudCog,
  FolderOpen,
  HardDrive,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { MeshlyLogo } from "@/components/brand/meshly-logo";
import { uploadMeshlyFile, uploadMeshlyFolder } from "@/lib/client/upload";
import { primaryNavigation, systemNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const iconMap = {
  drive: FolderOpen,
  recent: Activity,
  starred: Star,
  shared: Share2,
  trash: Trash2,
  clouds: Cloud,
  storage: HardDrive,
  accounts: CloudCog,
  transfers: UploadCloud,
  activity: Activity,
  integrity: ShieldCheck,
};

type UploadState = { name: string; phase: string; percent: number; error?: string } | null;
type Pool = { total: number; used: number; free: number };
type Me = { user: { name: string | null; email: string; avatarUrl: string | null } };
type GoogleAccount = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  mode: string;
  status: string;
  priority: number;
  quotaLimit: number;
  quotaUsage: number;
  free: number;
};
type AccountsResponse = { accounts: GoogleAccount[] };

const fmt = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(bytes >= 10 * 1024 ** 3 ? 0 : 1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
};

const phaseLabel = (phase: string) => phase ? phase[0]!.toUpperCase() + phase.slice(1) : phase;

export function DriveShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [upload, setUpload] = useState<UploadState>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [uploadAccountId, setUploadAccountId] = useState("auto");
  const [search, setSearch] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const folderMatch = /^\/drive\/([^/]+)$/.exec(pathname);
  const currentParent = folderMatch ? decodeURIComponent(folderMatch[1]!) : null;
  const selectedAccount = uploadAccountId === "auto" ? null : accounts.find((account) => account.id === uploadAccountId) ?? null;
  const selectedAccountId = selectedAccount?.status === "healthy" ? selectedAccount.id : undefined;
  const destinationLabel = selectedAccountId ? selectedAccount?.name || selectedAccount?.email || "Selected Google account" : "Auto choose";

  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
    void Promise.all([
      fetch("/api/storage").then((response) => response.ok ? response.json() : null).then((value) => value && setPool(value as Pool)),
      fetch("/api/me").then((response) => response.ok ? response.json() : null).then((value) => value && setMe(value as Me)),
      fetch("/api/accounts").then((response) => response.ok ? response.json() : null).then((value) => value && setAccounts((value as AccountsResponse).accounts)),
      fetch("/api/settings").then((response) => response.ok ? response.json() : null).then((value) => {
        const theme = (value as { preferences?: { theme?: string } })?.preferences?.theme ?? "light";
        const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.classList.toggle("dark", dark);
      }),
    ]);
  }, []);

  const nav = (items: readonly { slug: string; label: string }[]) => items.map((item) => {
    const Icon = iconMap[item.slug as keyof typeof iconMap] ?? FolderOpen;
    const active = pathname === `/${item.slug}`;
    return (
      <Link
        onClick={() => setOpen(false)}
        key={item.slug}
        href={`/${item.slug}`}
        className={cn(
          "focus-ring flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition",
          active ? "bg-[var(--blue-soft)] font-semibold" : "hover:bg-[var(--surface-strong)]",
        )}
      >
        <Icon size={18} />
        {item.label}
      </Link>
    );
  });

  async function choose(file?: File) {
    if (!file) return;
    setNewOpen(false);
    setUpload({ name: file.name, phase: "Planning encrypted upload", percent: 0 });
    try {
      await uploadMeshlyFile(
        file,
        (progress) => setUpload({ name: file.name, phase: phaseLabel(progress.phase), percent: progress.percent }),
        currentParent,
        selectedAccountId,
      );
      setUpload({ name: file.name, phase: "Encrypted and verified", percent: 100 });
      window.dispatchEvent(new Event("meshly:refresh"));
      setTimeout(() => setUpload(null), 1800);
    } catch (error) {
      setUpload({ name: file.name, phase: "Upload failed", percent: 0, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  async function chooseMany(list: FileList | null) {
    if (!list?.length) return;
    for (const file of Array.from(list)) await choose(file);
  }

  async function chooseFolder(list: FileList | null) {
    if (!list?.length) return;
    setNewOpen(false);
    try {
      await uploadMeshlyFolder(
        list,
        currentParent,
        (name, index, total, progress) => setUpload({
          name: `${name} · ${index}/${total}`,
          phase: phaseLabel(progress.phase),
          percent: progress.percent,
        }),
        selectedAccountId,
      );
      window.dispatchEvent(new Event("meshly:refresh"));
      setUpload({ name: "Folder upload", phase: "Encrypted and verified", percent: 100 });
      setTimeout(() => setUpload(null), 1800);
    } catch (error) {
      setUpload({ name: "Folder upload", phase: "Upload failed", percent: 0, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  async function newFolder() {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    const response = await fetch("/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parentId: currentParent }),
    });
    if (!response.ok) {
      alert(response.status === 409 ? "A folder with this name already exists." : "Unable to create folder.");
      return;
    }
    setNewOpen(false);
    window.dispatchEvent(new Event("meshly:refresh"));
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/drive?search=${encodeURIComponent(query)}` : "/drive");
  }

  const initial = (me?.user.name ?? me?.user.email ?? "M").trim().charAt(0).toUpperCase() || "M";
  const ratio = pool?.total ? Math.min(100, Math.round((pool.used / pool.total) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void chooseMany(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void chooseFolder(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 bg-[var(--background)] px-3 sm:px-5">
        <button aria-label="Open navigation" className="focus-ring grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--surface)] lg:hidden" onClick={() => setOpen(true)}>
          <Menu size={21} />
        </button>
        <Link href="/drive" className="shrink-0"><MeshlyLogo /></Link>
        <form onSubmit={onSearch} className="mx-auto hidden h-12 max-w-3xl flex-1 items-center rounded-full bg-[var(--surface-strong)] px-4 md:flex">
          <Search size={20} className="text-[var(--muted)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search in Meshly" className="h-full w-full bg-transparent px-3 text-sm outline-none" placeholder="Search in Meshly" />
          <button aria-label="Search options" type="button" className="focus-ring rounded-full p-2 hover:bg-[var(--surface)]"><ChevronDown size={18} /></button>
        </form>
        <div className="ml-auto flex items-center gap-1">
          <Link aria-label="Help" href="/help" className="focus-ring grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--surface)]"><CircleHelp size={20} /></Link>
          <Link aria-label="Notifications" href="/notifications" className="focus-ring hidden h-10 w-10 place-items-center rounded-full hover:bg-[var(--surface)] sm:grid"><Bell size={20} /></Link>
          <Link aria-label="Settings" href="/settings/general" className="focus-ring grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--surface)]"><Settings size={20} /></Link>
          <Link aria-label="Profile" title={me?.user.email} href="/profile" className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#4285f4] to-[#34a853] text-sm font-semibold text-white">{initial}</Link>
        </div>
      </header>

      <div className="flex">
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--surface)] p-3 pt-4 transition-transform lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-64px)] lg:w-[256px] lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}>
          <div className="flex items-center justify-between px-2 lg:hidden">
            <MeshlyLogo />
            <button aria-label="Close navigation" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full"><X size={20} /></button>
          </div>

          <div className="relative mt-5 lg:mt-0">
            <button onClick={() => setNewOpen(!newOpen)} className="focus-ring flex items-center gap-3 rounded-2xl bg-[var(--background)] px-5 py-4 text-sm font-semibold shadow-[0_1px_3px_rgba(60,64,67,.3)] transition hover:shadow-md">
              <Plus size={22} />New
            </button>

            {newOpen && (
              <div className="absolute left-0 top-16 z-30 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2 shadow-xl">
                <button onClick={() => void newFolder()} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--surface)]">New folder</button>
                <button onClick={() => input.current?.click()} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-[var(--surface)]">Upload files</button>
                <button onClick={() => folderInput.current?.click()} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-[var(--surface)]">Upload folder</button>

                <div className="my-2 h-px bg-[var(--border)]" />
                <div className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Upload destination</div>
                <button
                  type="button"
                  onClick={() => setUploadAccountId("auto")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--surface)]"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--blue-soft)] text-[var(--blue)]"><CloudCog size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">Auto choose</div>
                    <div className="truncate text-xs text-[var(--muted)]">Choose a healthy Google account with enough space</div>
                  </div>
                  {!selectedAccountId && <Check size={16} className="shrink-0 text-[var(--blue)]" />}
                </button>

                <div className="max-h-44 overflow-y-auto">
                  {accounts.map((account) => {
                    const healthy = account.status === "healthy";
                    const selected = selectedAccountId === account.id;
                    return (
                      <button
                        type="button"
                        key={account.id}
                        disabled={!healthy}
                        onClick={() => healthy && setUploadAccountId(account.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                          healthy ? "hover:bg-[var(--surface)]" : "cursor-not-allowed opacity-50",
                        )}
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] text-xs font-semibold">
                          {(account.name || account.email).trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{account.name || account.email}</div>
                          <div className="truncate text-xs text-[var(--muted)]">{healthy ? `${fmt(account.free)} free · ${account.email}` : `${account.status} · ${account.email}`}</div>
                        </div>
                        {selected && <Check size={16} className="shrink-0 text-[var(--blue)]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-1 rounded-xl bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--muted)]">
                  Current: <span className="font-semibold text-[var(--foreground)]">{destinationLabel}</span>. Files stay whole inside one Google account and are encrypted before upload.
                </div>
                <a href="/api/auth/google/start?link=1" className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--blue)] hover:bg-[var(--surface)]">Connect another Google account</a>
              </div>
            )}
          </div>

          <nav className="mt-5 space-y-1">{nav(primaryNavigation)}</nav>
          <div className="my-4 h-px bg-[var(--border)]" />
          <nav className="space-y-1">{nav(systemNavigation)}</nav>

          <div className="mt-7 px-4">
            <div className="text-xs font-semibold">Google storage</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
              <div className="h-full rounded-full bg-[var(--blue)] transition-all" style={{ width: `${ratio}%` }} />
            </div>
            <div className="mt-2 whitespace-pre-line text-xs leading-5 text-[var(--muted)]">
              {pool ? `${fmt(pool.used)} used across connected accounts\n${fmt(pool.free)} available` : "Loading Google storage…"}
            </div>
            <Link href="/accounts" className="mt-3 inline-flex text-xs font-semibold text-[var(--blue)]">Manage Google accounts</Link>
          </div>
        </aside>

        {open && <button aria-label="Close overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden" />}
        <main className="min-w-0 flex-1 bg-[var(--surface)] lg:rounded-tl-[24px]">{children}</main>
      </div>

      {upload && (
        <div className="fixed bottom-5 right-5 z-[70] w-[min(380px,calc(100vw-40px))] rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", upload.error ? "bg-[var(--surface-strong)] text-[var(--red)]" : "bg-[var(--blue-soft)] text-[var(--blue)]")}>
              {upload.error ? <UploadCloud size={19} /> : <LockKeyhole size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{upload.name}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{upload.error ?? `Encrypted upload · ${upload.phase}`}</div>
            </div>
            <span className="text-xs font-semibold">{upload.percent}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div className="h-full rounded-full bg-[var(--blue)] transition-all" style={{ width: `${upload.percent}%` }} />
          </div>
          {upload.error && <button onClick={() => setUpload(null)} className="mt-3 text-xs font-semibold text-[var(--blue)]">Dismiss</button>}
        </div>
      )}
    </div>
  );
}
