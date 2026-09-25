"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  Grid2X2,
  Info,
  List,
  MoreVertical,
  Move,
  Plus,
  RotateCcw,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";

type Item = {
  id: string;
  parentId: string | null;
  name: string;
  mimeType: string;
  size: number;
  sha256: string | null;
  status: string;
  starred: boolean;
  description: string | null;
  version: number;
  trashedAt: string | null;
  createdAt: string;
  modifiedAt: string;
  kind: "folder" | "file";
  sourceKind: "managed" | "external";
  sourceAccountId: string | null;
  sourceDriveFileId: string | null;
  sourceMimeType: string | null;
  sourceWebViewLink: string | null;
};
type Crumb = { id: string | null; name: string };
type Details = {
  item: Item;
  allocation: { part: number; size: number; status: string; accountEmail: string; accountId: string }[];
};
type Scope = "folder" | "recent" | "starred" | "trash";

function fileIcon(item: Item) {
  if (item.kind === "folder") return Folder;
  if (item.mimeType.startsWith("image/")) return FileImage;
  if (item.mimeType.includes("zip") || item.mimeType.includes("archive")) return FileArchive;
  return FileText;
}
function fmtSize(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
function fmtDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function DriveView({ parentId = null, scope = "folder", query = "" }: { parentId?: string | null; scope?: Scope; query?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([{ id: null, name: "My Drive" }]);
  const [grid, setGrid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [details, setDetails] = useState<Details | null>(null);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  const [folders, setFolders] = useState<Item[]>([]);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ scope: query ? "all" : scope });
    if (parentId) params.set("parentId", parentId);
    if (query) params.set("q", query);
    try {
      const response = await fetch(`/api/items?${params.toString()}`, { cache: "no-store" });
      setError("");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) throw new Error("Unable to load files");
      const data = (await response.json()) as { items: Item[]; breadcrumbs: Crumb[] };
      setItems(data.items);
      setBreadcrumbs(data.breadcrumbs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load files");
    } finally {
      setLoading(false);
    }
  }, [parentId, query, router, scope]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const refresh = () => void load();
    window.addEventListener("meshly:refresh", refresh);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("meshly:refresh", refresh);
    };
  }, [load]);

  async function patch(item: Item, body: Record<string, unknown>) {
    setBusy(item.id);
    try {
      const response = await fetch(`/api/items/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(data.message ?? data.error ?? "Action failed");
      }
      await load();
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : "Action failed");
    } finally {
      setBusy("");
      setMenu(null);
    }
  }
  async function createFolder() {
    const name = folderName.trim();
    if (!name) return;
    setBusy("create");
    try {
      const response = await fetch("/api/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, parentId }) });
      if (!response.ok) throw new Error(response.status === 409 ? "A folder with this name already exists." : "Unable to create folder.");
      setFolderName("");
      setCreateOpen(false);
      await load();
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : "Unable to create folder");
    } finally {
      setBusy("");
    }
  }
  async function rename(item: Item) {
    const name = prompt("Rename", item.name)?.trim();
    if (name && name !== item.name) await patch(item, { op: "rename", name });
  }
  async function showDetails(item: Item) {
    setMenu(null);
    const response = await fetch(`/api/items/${item.id}`);
    if (response.ok) setDetails((await response.json()) as Details);
  }
  async function share(item: Item) {
    setMenu(null);
    const password = prompt("Optional password for this share link. Leave blank for no password.", "");
    if (password === null) return;
    const response = await fetch("/api/shares", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileId: item.id, password: password || null, expiresHours: 168 }) });
    if (!response.ok) return alert("Unable to create share link.");
    const data = (await response.json()) as { url: string };
    const url = `${window.location.origin}${data.url}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    prompt("Share link copied", url);
  }
  async function startMove(item: Item) {
    setMenu(null);
    const response = await fetch("/api/items?scope=all");
    if (!response.ok) return;
    const data = (await response.json()) as { items: Item[] };
    setFolders(data.items.filter((candidate) => candidate.kind === "folder" && candidate.id !== item.id && candidate.sourceKind === "managed"));
    setMoveItem(item);
  }
  async function permanent(item: Item) {
    if (!confirm(`Permanently delete “${item.name}”? This removes its physical Drive chunks and cannot be undone.`)) return;
    setBusy(item.id);
    try {
      const response = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Delete failed");
      }
      await load();
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : "Delete failed");
    } finally {
      setBusy("");
    }
  }

  const title = query ? `Search results for “${query}”` : scope === "recent" ? "Recent" : scope === "starred" ? "Starred" : scope === "trash" ? "Trash" : "My Drive";
  const foldersHere = scope === "folder" && !query ? items.filter((item) => item.kind === "folder") : [];
  const files = scope === "folder" && !query ? items.filter((item) => item.kind !== "folder") : items;

  function itemMenu(item: Item) {
    const external = item.sourceKind === "external";
    return <div className="absolute right-0 top-10 z-30 w-52 rounded-xl border border-[var(--border)] bg-[var(--background)] p-1.5 text-sm shadow-xl">
      {external && item.sourceWebViewLink && <a target="_blank" rel="noreferrer" href={item.sourceWebViewLink} className="menu-item"><ExternalLink size={15}/>Open in Google Drive</a>}
      {item.kind === "file" && <><button onClick={() => window.open(`/api/files/${item.id}/preview`, "_blank")} className="menu-item"><Eye size={15}/>Preview</button><a href={`/api/files/${item.id}/download`} className="menu-item"><Download size={15}/>Download</a><button onClick={() => void share(item)} className="menu-item"><Share2 size={15}/>Share</button></>}
      {!item.trashedAt && !external && <><button onClick={() => void rename(item)} className="menu-item">Rename</button><button onClick={() => void startMove(item)} className="menu-item"><Move size={15}/>Move</button></>}
      {!item.trashedAt && <button onClick={() => void patch(item, { op: "star", starred: !item.starred })} className="menu-item"><Star size={15}/>{item.starred ? "Unstar" : "Star"}</button>}
      {!item.trashedAt && !external && <button onClick={() => void patch(item, { op: "trash" })} className="menu-item text-[var(--red)]"><Trash2 size={15}/>Move to trash</button>}
      {item.trashedAt && !external && <><button onClick={() => void patch(item, { op: "restore" })} className="menu-item"><RotateCcw size={15}/>Restore</button><button onClick={() => void permanent(item)} className="menu-item text-[var(--red)]"><Trash2 size={15}/>Delete forever</button></>}
      <button onClick={() => void showDetails(item)} className="menu-item"><Info size={15}/>Details</button>
    </div>;
  }

  return <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-medium">{title}</h1>{scope === "folder" && !query && <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-[var(--muted)]">{breadcrumbs.map((crumb, index) => <span className="flex items-center gap-1" key={crumb.id ?? "root"}>{index > 0 && <ChevronRight size={13}/>}<Link className="rounded px-1 py-0.5 hover:bg-[var(--background)]" href={crumb.id ? `/drive/${crumb.id}` : "/drive"}>{crumb.name}</Link></span>)}</div>}</div><div className="flex items-center gap-2">{scope === "folder" && !query && <button onClick={() => setCreateOpen(true)} className="btn"><Plus size={17}/>New folder</button>}<div className="flex items-center rounded-full border border-[var(--border)] bg-[var(--background)] p-1"><button aria-label="List view" onClick={() => setGrid(false)} className={`grid h-8 w-10 place-items-center rounded-full ${!grid ? "bg-[var(--surface-strong)]" : ""}`}><List size={17}/></button><button aria-label="Grid view" onClick={() => setGrid(true)} className={`grid h-8 w-10 place-items-center rounded-full ${grid ? "bg-[var(--surface-strong)]" : ""}`}><Grid2X2 size={17}/></button></div></div></div>
    {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}
    {loading && <div className="mt-12 text-center text-sm text-[var(--muted)]">Loading your workspace…</div>}
    {!loading && !error && items.length === 0 && <div className="mt-16 text-center"><Folder size={42} className="mx-auto text-[var(--muted)]"/><h2 className="mt-4 font-medium">Nothing here yet</h2><p className="mt-1 text-sm text-[var(--muted)]">Upload files, create a folder, or index a Full Drive account.</p></div>}

    {!loading && foldersHere.length > 0 && <><h2 className="mt-7 text-sm font-semibold">Folders</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{foldersHere.map((item) => <article key={item.id} className="mesh-card relative flex items-center gap-3 p-4"><Link href={`/drive/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3"><Folder className="fill-[#5f6368] text-[#5f6368]" size={22}/><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-medium">{item.name}</span>{item.sourceKind === "external" && <span className="rounded-full bg-[var(--blue-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--blue)]">Google</span>}</div><div className="mt-1 text-xs text-[var(--muted)]">Updated {fmtDate(item.modifiedAt)}</div></div></Link><button aria-label="Folder actions" disabled={busy === item.id} onClick={() => setMenu(menu === item.id ? null : item.id)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--surface)]"><MoreVertical size={17}/></button>{menu === item.id && itemMenu(item)}</article>)}</div></>}

    {!loading && files.length > 0 && <><h2 className="mt-8 text-sm font-semibold">{scope === "folder" && !query ? "Files" : "Items"}</h2>{grid ? <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{files.map((item) => { const Icon = fileIcon(item); return <article key={item.id} className="mesh-card relative p-3"><div className="flex items-center gap-2"><Icon size={18}/><div className="truncate text-sm font-medium">{item.name}</div>{item.sourceKind === "external" && <span className="rounded-full bg-[var(--blue-soft)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--blue)]">G</span>}<button onClick={() => setMenu(menu === item.id ? null : item.id)} className="ml-auto grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--surface)]"><MoreVertical size={17}/></button>{menu === item.id && itemMenu(item)}</div><button onClick={() => item.kind === "folder" ? router.push(`/drive/${item.id}`) : window.open(`/api/files/${item.id}/preview`, "_blank")} className="mt-3 grid aspect-[16/10] w-full place-items-center rounded-xl bg-[var(--surface-strong)]"><Icon size={42} className="text-[var(--muted)]"/></button><div className="mt-3 flex justify-between gap-2 text-xs text-[var(--muted)]"><span>{item.kind === "folder" ? "Folder" : fmtSize(item.size)}</span><span className="truncate">{fmtDate(item.modifiedAt)}</span></div></article>; })}</div> : <div className="mesh-card mt-3 overflow-visible"><div className="hidden grid-cols-[minmax(220px,2fr)_110px_170px_48px] gap-3 border-b border-[var(--border)] px-4 py-3 text-xs font-semibold text-[var(--muted)] md:grid"><span>Name</span><span>Size</span><span>Modified</span><span/></div>{files.map((item) => { const Icon = fileIcon(item); return <div key={item.id} className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0 md:grid-cols-[minmax(220px,2fr)_110px_170px_48px]"><div className="flex min-w-0 items-center gap-3">{item.starred && <Star size={13} className="fill-[var(--yellow)] text-[var(--yellow)]"/>}<Icon size={20} className="shrink-0 text-[var(--muted)]"/>{item.kind === "folder" ? <Link href={`/drive/${item.id}`} className="truncate text-sm font-medium hover:underline">{item.name}</Link> : <button onClick={() => void showDetails(item)} className="truncate text-left text-sm font-medium hover:underline">{item.name}</button>}{item.sourceKind === "external" && <span className="rounded-full bg-[var(--blue-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--blue)]">Google</span>}</div><div className="hidden text-xs text-[var(--muted)] md:block">{item.kind === "folder" ? "—" : fmtSize(item.size)}</div><div className="hidden text-xs text-[var(--muted)] md:block">{fmtDate(item.modifiedAt)}</div><button aria-label={`More actions for ${item.name}`} onClick={() => setMenu(menu === item.id ? null : item.id)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--surface)]"><MoreVertical size={17}/></button>{menu === item.id && itemMenu(item)}</div>; })}</div>}</>}

    {createOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/30 p-4"><div className="w-full max-w-sm rounded-2xl bg-[var(--background)] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-semibold">New folder</h2><button onClick={() => setCreateOpen(false)}><X size={18}/></button></div><input autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void createFolder()} className="mt-4 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 outline-none focus:border-[var(--blue)]" placeholder="Folder name"/><div className="mt-4 flex justify-end gap-2"><button onClick={() => setCreateOpen(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button><button disabled={!folderName.trim() || busy === "create"} onClick={() => void createFolder()} className="rounded-full bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button></div></div></div>}

    {details && <div className="fixed inset-y-0 right-0 z-[75] w-full max-w-md overflow-auto border-l border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-semibold">File details</h2><button onClick={() => setDetails(null)}><X size={20}/></button></div><h3 className="mt-6 break-words text-lg font-medium">{details.item.name}</h3><dl className="mt-5 grid grid-cols-[120px_1fr] gap-y-3 text-sm"><dt className="text-[var(--muted)]">Source</dt><dd>{details.item.sourceKind === "external" ? "Indexed Google Drive" : "Meshly managed"}</dd><dt className="text-[var(--muted)]">Type</dt><dd>{details.item.sourceMimeType ?? details.item.mimeType}</dd><dt className="text-[var(--muted)]">Size</dt><dd>{fmtSize(details.item.size)}</dd><dt className="text-[var(--muted)]">Status</dt><dd className="capitalize">{details.item.status}</dd><dt className="text-[var(--muted)]">Modified</dt><dd>{fmtDate(details.item.modifiedAt)}</dd><dt className="text-[var(--muted)]">SHA-256</dt><dd className="break-all font-mono text-xs">{details.item.sha256 ?? "—"}</dd></dl>{details.item.sourceWebViewLink && <a target="_blank" rel="noreferrer" href={details.item.sourceWebViewLink} className="btn mt-5"><ExternalLink size={15}/>Open source</a>}{details.allocation.length > 0 && <><h4 className="mt-7 text-sm font-semibold">Physical allocation</h4><div className="mt-2 space-y-2">{details.allocation.map((allocation) => <div key={`${allocation.accountId}-${allocation.part}`} className="rounded-xl bg-[var(--surface)] p-3 text-xs"><div className="font-medium">Part {allocation.part + 1} · {fmtSize(allocation.size)}</div><div className="mt-1 text-[var(--muted)]">{allocation.accountEmail} · {allocation.status}</div></div>)}</div></>}</div>}

    {moveItem && <div className="fixed inset-0 z-[85] grid place-items-center bg-black/30 p-4"><div className="max-h-[70vh] w-full max-w-md overflow-auto rounded-2xl bg-[var(--background)] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-semibold">Move “{moveItem.name}”</h2><button onClick={() => setMoveItem(null)}><X size={18}/></button></div><button onClick={() => { void patch(moveItem, { op: "move", parentId: null }); setMoveItem(null); }} className="mt-4 w-full rounded-xl px-3 py-3 text-left hover:bg-[var(--surface)]">My Drive</button>{folders.map((folder) => <button key={folder.id} onClick={() => { void patch(moveItem, { op: "move", parentId: folder.id }); setMoveItem(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left hover:bg-[var(--surface)]"><Folder size={17}/>{folder.name}</button>)}</div></div>}
  </div>;
}
