import { financial360 } from './financial-360';
import { receivableAgeing } from './receivable-ageing';
import { shipmentAlerts } from './shipment-alerts';
import { entityLabel, inactive } from './relationships';

export function dashboardAlerts(records: any[], fy: string, today: string) {
  const byId = new Map(records.map(r => [r.id, r]));
  const receivables = financial360(records, fy).lines
    .filter(line => line.fy === fy && line.type === 'Receivable' && line.balance > 0)
    .flatMap(line => {
      const invoice = byId.get(line.id);
      if (!invoice || (!invoice.importLocked && !['Posted', 'Imported'].includes(invoice.status))) return [];
      const bucket = receivableAgeing(invoice.dueDate, today);
      if (['Current', 'No due date'].includes(bucket)) return [];
      return [{ id: 'due-' + line.id, severity: bucket === '90+' ? 'Critical' : 'Warning',
        title: line.reference + ' receivable overdue',
        detail: `${line.currency} ${(line.balance / 100).toFixed(2)} pending · ${bucket} days`,
        route: invoice.kind + '?record=' + encodeURIComponent(line.id),
        group: 'Receivables' }];
    });
  const tasks = records.filter(r => r.kind === 'tasks' && r.fy === fy && !inactive(r) &&
    !['Completed', 'Closed', 'Done', 'Resolved'].includes(r.status) &&
    !['Current', 'No due date'].includes(receivableAgeing(r.dueDate, today)))
    .map(r => ({ id: 'task-' + r.id, severity: 'Attention', title: entityLabel(r) + ' is overdue',
      detail: `Due ${r.dueDate}${r.owner ? ' · ' + r.owner : ''}`,
      route: 'tasks?record=' + encodeURIComponent(r.id), group: 'Tasks' }));
  const severity: Record<string, number> = { Critical: 0, Warning: 1, Attention: 2 };
  return [...receivables, ...shipmentAlerts(records, fy, today).map(a => ({ ...a, group: 'Shipments' })), ...tasks]
    .sort((a, b) => severity[a.severity] - severity[b.severity] || a.id.localeCompare(b.id));
}
