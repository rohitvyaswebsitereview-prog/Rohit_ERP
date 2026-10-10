import { dashboardAlerts } from './dashboard-alerts';
import { stockAlerts } from './stock-alerts';

export type AttentionAlert = {
  id: string;
  name: string;
  title: string;
  detail: string;
  route: string;
  group: string;
  category: string;
  severity: 'Critical' | 'Warning' | 'Attention';
  dueDate: string;
  owner: string;
  resolution: 'Unresolved';
};

const severityOrder: Record<string, number> = { Critical: 0, Warning: 1, Attention: 2 };
const active = (status: unknown) => !['Resolved', 'Completed', 'Closed', 'Done', 'Cancelled', 'Reversed', 'Inactive'].includes(String(status || ''));
const severity = (value: unknown): AttentionAlert['severity'] =>
  value === 'Critical' || value === 'Warning' ? value : 'Attention';

/** The same current-condition list drives the dashboard, bell, and acknowledgement IDs. */
export function attentionAlerts(records: any[], balances: any[], fy: string, today: string): AttentionAlert[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  const saved = records
    .filter((record) => record.kind === 'exceptions' && (record.fy === fy || record.fy === 'master') && active(record.status))
    .map((record) => ({
      id: String(record.id),
      name: String(record.name || record.reference || 'Recorded exception'),
      title: String(record.name || record.reference || 'Recorded exception'),
      detail: String(record.notes || record.category || 'Recorded exception requires review.'),
      route: 'exceptions?record=' + encodeURIComponent(record.id),
      group: 'Exceptions',
      category: String(record.category || 'Exceptions'),
      severity: severity(record.severity),
      dueDate: String(record.dueDate || ''),
      owner: String(record.owner || record.assignedTo || 'Unassigned'),
      resolution: 'Unresolved' as const,
    }));
  const generated = [...dashboardAlerts(records, fy, today), ...stockAlerts(records, balances)]
    .map((alert) => {
      const sourceId = alert.id.replace(/^(?:due|task|stock|etd|eta)-/, '');
      const source = byId.get(sourceId);
      const group = String('group' in alert ? alert.group : 'Operations');
      const title = String(alert.title);
      return {
        id: String(alert.id), name: title, title,
        detail: String(alert.detail || ''), route: String(alert.route),
        group, category: group, severity: severity(alert.severity),
        dueDate: String('dueDate' in alert ? alert.dueDate || '' : ''),
        owner: String(source?.owner || source?.assignedTo || 'Unassigned'),
        resolution: 'Unresolved' as const,
      };
    });
  return [...new Map([...saved, ...generated].map((alert) => [alert.id, alert])).values()]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] ||
      (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.id.localeCompare(b.id));
}
