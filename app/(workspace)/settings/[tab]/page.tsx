import { Settings, Shield, Palette, HardDrive, ArrowUpDown, Bell, SlidersHorizontal } from "lucide-react";
import { settingsTabs } from "@/lib/navigation";
import { notFound } from "next/navigation";

const icons = { general: Settings, storage: HardDrive, transfers: ArrowUpDown, appearance: Palette, security: Shield, notifications: Bell, advanced: SlidersHorizontal };
const descriptions: Record<string,string> = {
  general: "Choose startup view, file density, date formatting and workspace preferences.",
  storage: "Control placement priority, reserve space, whole-file-first behavior and chunk sizing.",
  transfers: "Tune concurrent uploads, retries, resumable transfer behavior and bandwidth preferences.",
  appearance: "Choose light, dark or system theme, density and motion preferences.",
  security: "Review sessions, connected Google accounts, token access and sensitive-operation confirmations.",
  notifications: "Decide which transfer, quota, integrity and account-health events should notify you.",
  advanced: "Rebuild indexes, export metadata, inspect diagnostics and manage experimental features.",
};

export default async function SettingsPage({ params }:{ params:Promise<{tab:string}>}) {
 const { tab }=await params; if(!(settingsTabs as readonly string[]).includes(tab)) notFound(); const Icon=icons[tab as keyof typeof icons] ?? Settings;
 return <div className="mx-auto max-w-4xl p-4 sm:p-8"><div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-strong)]"><Icon size={22}/></div><div><h1 className="text-2xl font-semibold capitalize">{tab}</h1><p className="mt-1 text-sm text-[var(--muted)]">{descriptions[tab]}</p></div></div><section className="mesh-card mt-7 divide-y divide-[var(--border)] overflow-hidden">{["Default behavior","Automation","Privacy & safety"].map((x,i)=><div className="flex items-center justify-between gap-4 p-5 sm:p-6" key={x}><div><h2 className="font-medium">{x}</h2><p className="mt-1 text-sm text-[var(--muted)]">{i===0?"Recommended defaults are enabled.":i===1?"Meshly applies safe automatic behavior where possible.":"Sensitive changes always require explicit confirmation."}</p></div><button className="focus-ring rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium">Configure</button></div>)}</section></div>
}
