"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HardDrive, LockKeyhole, Palette, Save, Shield, SlidersHorizontal } from "lucide-react";
import { settingsTabs } from "@/lib/navigation";

type Tab = (typeof settingsTabs)[number];
type Prefs = {
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
  defaultView: "list" | "grid";
  wholeFileFirst: boolean;
  reserveBytes: number;
  notifications: boolean;
};

export function SettingsView({ tab }: { tab: Tab }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/settings")
      .then((response) => response.json())
      .then((value) => setPrefs((value as { preferences: Prefs }).preferences));
  }, []);

  async function save() {
    if (!prefs) return;
    setSaving(true);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...prefs, wholeFileFirst: true }),
    });
    setSaving(false);
    setMessage(response.ok ? "Settings saved." : "Unable to save settings.");
    if (response.ok) {
      const dark = prefs.theme === "dark" || (prefs.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    }
  }

  async function maintenance(path: string) {
    setMessage("Running…");
    const response = await fetch(path, { method: "POST" });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    setMessage(response.ok ? `Completed: ${JSON.stringify(result)}` : "Operation failed.");
  }

  if (!prefs) return <div className="p-8 text-sm text-[var(--muted)]">Loading settings…</div>;

  return <div className="mx-auto max-w-4xl p-4 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold capitalize">{tab}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Meshly preferences are stored per account and applied across sessions.</p>
      </div>
      {!['security', 'advanced'].includes(tab) && <button disabled={saving} onClick={() => void save()} className="btn"><Save size={16}/>{saving ? "Saving…" : "Save"}</button>}
    </div>
    {message && <div className="mt-4 rounded-xl bg-[var(--blue-soft)] px-4 py-3 text-sm">{message}</div>}

    <div className="mesh-card mt-6 overflow-hidden">
      {tab === "general" && <>
        <Row title="Default file view" text="Choose how file lists open by default. The workspace now applies this preference when a Drive view loads.">
          <Select value={prefs.defaultView} onChange={(value) => setPrefs({ ...prefs, defaultView: value as Prefs["defaultView"] })} values={["list", "grid"]}/>
        </Row>
        <Row title="Interface density" text="Comfortable and compact spacing are applied to file lists.">
          <Select value={prefs.density} onChange={(value) => setPrefs({ ...prefs, density: value as Prefs["density"] })} values={["comfortable", "compact"]}/>
        </Row>
      </>}

      {tab === "appearance" && <Row title="Theme" text="Light mode is Meshly's default; dark and system modes are supported.">
        <Palette size={18}/>
        <Select value={prefs.theme} onChange={(value) => setPrefs({ ...prefs, theme: value as Prefs["theme"] })} values={["light", "dark", "system"]}/>
      </Row>}

      {tab === "storage" && <>
        <Row title="Whole-file Google placement" text="Every Meshly-managed Google file stays whole in one healthy Google account. Cross-account Google sharding is intentionally disabled.">
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Always on</span>
        </Row>
        <Row title="Per-account safety reserve" text="Meshly avoids consuming the final reserved capacity of a Google account when automatically choosing a destination.">
          <HardDrive size={18}/>
          <input className="w-28 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" type="number" min="0" step="0.25" value={(prefs.reserveBytes / 1024 ** 3).toFixed(2)} onChange={(event) => setPrefs({ ...prefs, reserveBytes: Math.max(0, Number(event.target.value) || 0) * 1024 ** 3 })}/>
          <span className="text-sm">GB</span>
        </Row>
        <Row title="Google accounts" text="Refresh quota data, change upload availability, grant optional existing-file read access, or connect another account.">
          <Link href="/accounts" className="btn">Manage Google</Link>
        </Row>
        <Row title="Other clouds" text="Review Dropbox, TeraBox and future provider connections. Managed uploads stay hidden until each provider's safety gate is verified and enabled.">
          <Link href="/clouds" className="btn">Other Clouds</Link>
        </Row>
      </>}

      {tab === "transfers" && <>
        <Row title="Encrypted resumable Google uploads" text="Managed files are encrypted in authenticated frames before provider storage. Transient failures reconcile the provider's accepted offset and continue from a valid encrypted-frame boundary.">
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Always on</span>
        </Row>
        <Row title="Remote verification before ready" text="A managed file is not exposed as ready until its encrypted provider object has been verified.">
          <LockKeyhole size={18}/><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Required</span>
        </Row>
        <Row title="Transfer center" text="Review upload, download and transfer-related activity.">
          <Link href="/transfers" className="btn">Open transfers</Link>
        </Row>
      </>}

      {tab === "notifications" && <Row title="Workspace notifications" text="Show transfer, account-health, integrity and recovery events.">
        <Toggle checked={prefs.notifications} onChange={(value) => setPrefs({ ...prefs, notifications: value })}/>
      </Row>}

      {tab === "security" && <>
        <Row title="Managed-file encryption" text="New Meshly-managed files use encryption v1 before cloud storage. The current design is backend-trusted and is not described as zero-knowledge.">
          <LockKeyhole size={18}/><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Encryption v1</span>
        </Row>
        <Row title="Google account access" text="Refresh tokens are encrypted before database storage. Manage account access or reconnect revoked accounts.">
          <Shield size={18}/><Link href="/accounts" className="btn">Review accounts</Link>
        </Row>
        <Row title="Session" text="End the current Meshly browser session.">
          <form action="/api/auth/logout" method="post"><button className="btn">Sign out</button></form>
        </Row>
      </>}

      {tab === "advanced" && <>
        <Row title="Recovery snapshot" text="Write a signed recovery manifest to healthy supported account storage without plaintext file keys or provider credentials.">
          <SlidersHorizontal size={18}/><button className="btn" onClick={() => void maintenance("/api/recovery")}>Write snapshot</button>
        </Row>
        <Row title="Integrity scan" text="Verify indexed managed objects against provider state and surface degraded files.">
          <button className="btn" onClick={() => void maintenance("/api/integrity")}>Run scan</button>
        </Row>
        <Row title="Diagnostics" text="Check the current service and configuration state without exposing secrets.">
          <Link href="/diagnostics" className="btn">Open diagnostics</Link>
        </Row>
      </>}
    </div>
  </div>;
}

function Row({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] p-5 last:border-0">
    <div className="min-w-[220px] flex-1"><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[var(--muted)]">{text}</p></div>
    <div className="flex items-center gap-2">{children}</div>
  </div>;
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-[var(--blue)]" : "bg-[var(--border)]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`}/></button>;
}
function Select({ value, onChange, values }: { value: string; onChange: (value: string) => void; values: string[] }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm capitalize">{values.map((value) => <option key={value}>{value}</option>)}</select>;
}
