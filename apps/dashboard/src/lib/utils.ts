import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomUUID } from "node:crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a short unique ID (12 hex chars). */
export function generateId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

/** Generate a `bastion_`-prefixed API key (48 hex chars). */
export function generateApiKey(): string {
  return `bastion_${randomUUID().replace(/-/g, "")}${randomUUID()
    .replace(/-/g, "")
    .slice(0, 16)}`;
}

/** Format bytes to human-readable string. */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Format an ISO date string to a human-readable form. */
export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Format a date to a relative time string (e.g. "2 hours ago"). */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Truncate a string to a given length with ellipsis. */
export function truncate(str: string, max = 80): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
