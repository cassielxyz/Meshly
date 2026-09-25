import * as React from "react";
import { cn } from "@/lib/utils";
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?:"primary"|"secondary"|"ghost"|"danger" };
export function Button({className,variant="primary",...props}:ButtonProps){const styles={primary:"bg-[var(--blue)] text-white hover:brightness-95",secondary:"border border-[var(--border)] bg-white hover:bg-[var(--surface)]",ghost:"hover:bg-[var(--surface)]",danger:"bg-[var(--red)] text-white hover:brightness-95"};return <button className={cn("focus-ring inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",styles[variant],className)} {...props}/>}
