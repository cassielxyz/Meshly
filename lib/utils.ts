import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs));}
export function formatBytes(bytes:number){if(bytes===0)return"0 B";const k=1024;const units=["B","KB","MB","GB","TB"];const i=Math.min(Math.floor(Math.log(bytes)/Math.log(k)),units.length-1);return `${(bytes/Math.pow(k,i)).toFixed(i>2?2:1)} ${units[i]}`;}
