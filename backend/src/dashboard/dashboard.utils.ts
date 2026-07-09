export function startOfIsoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function buildLastNWeeks(now: Date, n: number): string[] {
  const currentWeekStart = startOfIsoWeek(now);
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(currentWeekStart);
    d.setUTCDate(d.getUTCDate() - i * 7);
    result.push(startOfIsoWeek(d));
  }
  return result;
}
