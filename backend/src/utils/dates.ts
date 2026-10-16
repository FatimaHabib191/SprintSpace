/** Parses 'YYYY-MM-DD' into a Date at UTC midnight. */
export function dayStart(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00.000Z`);
}

/** The caller's "today" (client supplies its local calendar day; falls back to server UTC day). */
export function resolveToday(input?: unknown): Date {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const d = dayStart(input);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
