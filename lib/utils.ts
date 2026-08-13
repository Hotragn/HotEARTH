import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The shadcn/ui class helper: clsx for conditional classes, tailwind-merge to
 * resolve conflicting Tailwind utilities so a later class wins predictably.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a NOAA-style timestamp that has no zone marker, strictly, as UTC.
 *
 * NOAA SWPC and CO-OPS both send times like "2026-08-13 00:12" or
 * "2026-08-13T00:12:00", leaving the zone implied. The obvious approach is to
 * bolt a "Z" on and hand it to `new Date`, and that is a trap:
 *
 *   new Date("badTtime:00Z")  ->  2000-01-01T00:00:00.000Z
 *
 * V8's date parser is lenient, and it salvages garbage into a REAL date rather
 * than an Invalid Date. A `Number.isFinite(d.getTime())` guard sails straight
 * past it, and a corrupt row from a feed becomes a plausible-looking sample in
 * the year 2000 sitting in the middle of a chart.
 *
 * So the shape is checked with a regex first, and only then parsed. Returns null
 * for anything that is not a real timestamp.
 */
export function parseUtcTimestamp(tag: unknown): Date | null {
  if (typeof tag !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z?$/.exec(
    tag.trim()
  );
  if (!m) return null;

  const [, y, mo, d, h, mi, sec] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = sec === undefined ? 0 : Number(sec);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 60) return null;

  const ms = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  // Reject a rolled-over date (e.g. the 31st of February).
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}
