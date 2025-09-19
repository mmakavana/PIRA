export const MS_PER_DAY = 86_400_000;

// Always store dates as epoch (ms) at UTC noon for DST safety.
export function toEpochUTCNoon(dateStrYYYYMMDD: string): number {
  if (!dateStrYYYYMMDD) return NaN;
  const [y, m, d] = dateStrYYYYMMDD.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function toInputYYYYMMDD(epochUTCNoon: number): string {
  if (!Number.isFinite(epochUTCNoon)) return "";
  const d = new Date(epochUTCNoon);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function clamp(ms: number, start: number, end: number) {
  return Math.max(start, Math.min(end, ms));
}

/** position (px) from window start using exact day deltas */
export function xFromDate(dateMs: number, winStart: number, pxPerDay: number) {
  const days = (dateMs - winStart) / MS_PER_DAY;
  return days * pxPerDay;
}

/** width (px) inclusive of end date */
export function widthFromDates(startMs: number, endMs: number, pxPerDay: number) {
  const days = (endMs - startMs) / MS_PER_DAY + 1;
  return Math.max(0, days * pxPerDay);
}

/** Create weekly ticks aligned to Sunday */
export function weeklyTicks(winStart: number, winEnd: number) {
  const ticks: number[] = [];
  const first = new Date(winStart);
  const dow = first.getUTCDay(); // 0=Sun
  const offset = (7 - dow) % 7;
  let t = winStart + offset * MS_PER_DAY;
  while (t <= winEnd) {
    ticks.push(t);
    t += 7 * MS_PER_DAY;
  }
  return ticks;
}

/** Month ticks (1st of each month) */
export function monthlyTicks(winStart: number, winEnd: number) {
  const s = new Date(winStart);
  const e = new Date(winEnd);
  const ticks: number[] = [];
  const d = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1, 12);
  let t = d;
  while (t <= winEnd) {
    ticks.push(t);
    const n = new Date(t);
    t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1, 12);
  }
  if (ticks[0] < winStart) ticks.shift();
  return ticks;
}

export function todayUTCNoon() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12);
}
