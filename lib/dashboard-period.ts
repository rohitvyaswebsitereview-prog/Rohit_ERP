export const dashboardPeriods = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Financial Year', 'Custom Period'];
export function dashboardPeriod(fy: string, period: string, today: string, customStart = '', customEnd = '') {
  const year = Number(fy.slice(0, 4));
  const first = `${year}-04-01`, last = `${year + 1}-03-31`;
  const d = new Date(today + 'T00:00:00Z');
  let start = first, end = today < last ? today : last;
  if (period === 'Custom Period') { start = customStart; end = customEnd; }
  if (period === 'Today') start = end = today;
  if (period === 'This Month') start = today.slice(0, 7) + '-01';
  if (period === 'This Week') { const weekday = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - weekday); start = d.toISOString().slice(0, 10); }
  if (period === 'This Quarter') start = `${d.getUTCFullYear()}-${String(Math.floor(d.getUTCMonth() / 3) * 3 + 1).padStart(2, '0')}-01`;
  const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  return { start, end, valid: validDate(start) && validDate(end) && start >= first && end <= last && start <= end };
}
