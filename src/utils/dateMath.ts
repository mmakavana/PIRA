// Fixed constants for our date-only timelines
export const MS_PER_DAY = 86_400_000;
export const PX_PER_DAY = 18; // keeps columns identical width; scrolling handles long ranges

// Always store dates as epoch (ms) at UTC noon (prevents DST/timezone drift)
export function toEpochUTCNoon(dateStrYYYYMMDD: string): number {
  if (!dateStrYYYYMMDD) return NaN;
  const [y, m, d] = dateStrYYYYMMDD.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function toInputYYYYMMDD(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Grid math
export function xFromDate(dateMs: number, startMs: number): number {
  return ((dateMs - startMs) / MS_PER_DAY) * PX_PER_DAY;
}

export function wFromDates(startMs: number, endMs: number): number {
  // inclusive of the due date
  return Math.max(0, ((endMs - startMs) / MS_PER_DAY + 1) * PX_PER_DAY);
}

// Week ticks starting on Sunday
export function weeklyTicks(startMs: number, endMs: number): number[] {
  const ticks: number[] = [];
  const s = new Date(startMs);
  const dow = s.getUTCDay(); // 0 = Sunday
  let first = startMs + ((7 - dow) % 7) * MS_PER_DAY; // first upcoming Sunday (or same day if Sunday)
  while (first <= endMs) {
    ticks.push(first);
    first += 7 * MS_PER_DAY;
  }
  return ticks;
}

// Helpers
export function addDays(ms: number, days: number): number {
  return ms + days * MS_PER_DAY;
}

export function isWeekendUTC(ms: number): boolean {
  const d = new Date(ms).getUTCDay();
  return d === 0 || d === 6;
}

export function clamp(ms: number, min: number, max: number): number {
  return Math.min(Math.max(ms, min), max);
}
