export const ageingBuckets = ['Current', '1-30', '31-60', '61-90', '90+', 'No due date'];
export function receivableAgeing(dueDate: unknown, today = new Date().toISOString().slice(0, 10)) {
  if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return 'No due date';
  const due = Date.parse(dueDate);
  if (!Number.isFinite(due) || new Date(due).toISOString().slice(0, 10) !== dueDate) return 'No due date';
  const days = Math.floor((Date.parse(today) - due) / 86400000);
  return days <= 0 ? 'Current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
}
