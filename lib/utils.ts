import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Slugify a project name the same way the original dashboard did:
 * lowercase, trim, collapse anything that isn't a-z0-9 into single dashes,
 * strip leading/trailing dashes, cap at 40 chars, fall back to "my-project".
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "my-project";
}

/** Resolve the deployed domain from project name + platform, same rule as the original. */
export function resolveDomain(projectName: string, platform: string): string {
  const slug = slugify(projectName);
  const p = platform.toLowerCase();
  if (p.includes("cloudflare") || p.includes("pages")) return `${slug}.pages.dev`;
  if (p.includes("railway")) return `${slug}.up.railway.app`;
  if (p.includes("render")) return `${slug}.onrender.com`;
  return `${slug}.vercel.app`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "Ival Ramadhan" -> "IR", single word -> first 2 letters. Used for avatar fallbacks. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500"];

/** Deterministic color per email/name so the same user always gets the same avatar color. */
export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
