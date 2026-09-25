import { cn } from "@/lib/utils";

export function MeshlyMark({ className = "" }:{className?:string}){
  return <svg className={className} width="34" height="34" viewBox="0 0 64 64" role="img" aria-label="Meshly logo"><path d="M11 19.5 29 9l8 13.6-18 10.5z" fill="#4285F4"/><path d="m37 22.6 16 9.3-8 13.8-16-9.4z" fill="#34A853"/><path d="m19 33.1 10 3.2 16 9.4-8 13.8-26-15z" fill="#FBBC04"/><path d="m11 19.5 8 13.6-8 11.5L3 30.8z" fill="#EA4335"/><circle cx="29" cy="36" r="5.2" fill="white"/></svg>;
}
export function MeshlyLogo({ className = "" }:{className?:string}){ return <div className={cn("flex items-center gap-2.5",className)}><MeshlyMark/><span className="text-[22px] font-semibold tracking-[-.04em]">Meshly</span></div> }
