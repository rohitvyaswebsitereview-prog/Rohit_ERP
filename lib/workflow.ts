import {
  Entity,
  Relationship,
  connected,
  exportScope,
  pendingFor,
  inactive,
  entityLabel,
} from './relationships';
export const dataViews = [
  'Operational',
  'Operational + Historical',
  'Historical only',
  'Imported / Migration',
  'All data',
] as const;
export type DataView = (typeof dataViews)[number];
export function sourceState(r: any): 'Live' | 'Historical' | 'Imported' {
  return r.dataState === 'Historical' || r.status === 'Historical'
    ? 'Historical'
    : r.dataState === 'Imported' ||
        r.importLocked ||
        r.importBatch ||
        r.status === 'Imported'
      ? 'Imported'
      : 'Live';
}
export function inDataView(r: any, view: string) {
  const state = sourceState(r);
  return (
    view === 'All data' ||
    (view === 'Operational' && state === 'Live') ||
    (view === 'Operational + Historical' && state !== 'Imported') ||
    (view === 'Historical only' && state === 'Historical') ||
    (view === 'Imported / Migration' && state === 'Imported')
  );
}
export function processState(r: any) {
  if (r.status === 'Active') return 'Active';
  if (
    sourceState(r) !== 'Live' &&
    !r.sourceStatus &&
    ['Imported', 'Historical'].includes(r.status)
  )
    return 'Not recorded';
  if (['Cancelled', 'Reversed'].includes(r.status)) return 'Cancelled';
  if (r.status === 'Rejected') return 'Rejected';
  if (r.status === 'Blocked') return 'Blocked';
  if (r.status === 'Closed') return 'Closed';
  if (['Completed', 'Delivered', 'Settled', 'Paid', 'Sold'].includes(r.status))
    return 'Completed';
  if (r.dueDate && r.dueDate < new Date().toISOString().slice(0, 10))
    return 'Overdue';
  if (r.status === 'Draft') return 'Draft';
  if (['Approved', 'Accepted', 'Ready'].includes(r.status)) return 'Ready';
  if (/await|pending|review/i.test(r.sourceStatus || r.status || ''))
    return 'Awaiting';
  return 'In progress';
}
export type Stage = {
  key: string;
  label: string;
  status: string;
  owner: string;
  requiredDocuments: string[];
  requiredFields: string[];
  dependencies: string[];
  dueDate: string;
  nextAction: string;
  exceptions: string[];
  recordIds: string[];
  checks: any[];
  route: string;
};
export function transactionScope(
  root: Entity,
  records: Entity[],
  edges: Relationship[],
) {
  if (!['invoices', 'domestic-invoices'].includes(root.kind))
    return connected(root.id, records, edges).records;
  const base = exportScope(root.id, records, edges).records;
  const ids = new Set(base.map((r) => r.id)),
    map = new Map(records.map((r) => [r.id, r]));
  for (const edge of edges)
    if (edge.status === 'Confirmed')
      for (const [a, b] of [
        [edge.source_id, edge.target_id],
        [edge.target_id, edge.source_id],
      ])
        if (ids.has(a)) {
          const target = map.get(b);
          if (
            target &&
            ([
              'customers',
              'vendors',
              'products',
              'machines',
              'warehouses',
            ].includes(target.kind) ||
              target.id === root.partnerId)
          )
            ids.add(b);
        }
  return records.filter((r) => ids.has(r.id));
}
const exportStageDefs = [
  [
    'commercial',
    'Commercial',
    ['Invoice'],
    ['quotations', 'sales-orders', 'proformas', 'invoices'],
    'invoices',
    'Sales',
  ],
  [
    'documents',
    'Export docs',
    ['Shipping bill', 'Bill of lading', 'Packing list'],
    ['shipping-bills', 'bills-of-lading', 'packing-lists', 'export-documents'],
    'documents-drive',
    'Export Documentation',
  ],
  [
    'shipment',
    'Shipment',
    ['Shipment completed'],
    ['shipments', 'export-shipments', 'transport', 'delivery-challans'],
    'shipments',
    'Logistics',
  ],
  [
    'realisation',
    'Realisation',
    ['Customer receipt', 'Bank realisation', 'Forex reference'],
    ['receipts', 'remittances', 'forex'],
    'receipts',
    'Finance',
  ],
  [
    'closure',
    'Closure',
    ['eBRC', 'DBK', 'RoDTEP', 'IGST refund'],
    ['ebrc', 'incentives'],
    'ebrc',
    'Finance',
  ],
] as const;
const familyStages: Record<string, any[]> = {
  sales: [
    ['lead', 'Opportunity', ['sales-projects'], 'sales-projects'],
    ['quotation', 'Quotation', ['quotations'], 'quotations'],
    ['confirmation', 'Customer confirmation', ['sales-orders'], 'sales-orders'],
    ['proforma', 'Proforma', ['proformas'], 'proformas'],
    ['invoice', 'Invoice', ['invoices', 'domestic-invoices'], 'invoices'],
  ],
  procurement: [
    ['order', 'Purchase order', ['purchase-orders'], 'purchase-orders'],
    ['advance', 'Advance', ['supplier-advances'], 'supplier-advances'],
    ['invoice', 'Purchase invoice', ['purchase-invoices'], 'purchase-invoices'],
    ['stock', 'Stock received', ['machines', 'purchase-invoices'], 'machines'],
    ['payment', 'Supplier payment', ['payments'], 'payments'],
  ],
  inventory: [
    ['purchased', 'Purchased', ['purchase-invoices'], 'purchase-invoices'],
    ['received', 'Received', ['purchase-invoices'], 'purchase-invoices'],
    ['stock', 'Stock', ['machines'], 'machines'],
    ['allocated', 'Allocated', ['sales-orders', 'proformas'], 'sales-orders'],
    ['sold', 'Sold', ['invoices', 'domestic-invoices'], 'invoices'],
    ['shipped', 'Shipped', ['shipments', 'bills-of-lading'], 'shipments'],
    ['delivered', 'Delivered', ['shipments'], 'shipments'],
  ],
  finance: [
    [
      'recorded',
      'Recorded',
      ['receipts', 'payments', 'remittances', 'forex'],
      'receipts',
    ],
    [
      'allocation',
      'Allocated',
      ['invoices', 'purchase-invoices', 'domestic-invoices', 'expenses'],
      'receivables',
    ],
    ['bank', 'Bank evidence', ['remittances', 'forex'], 'remittances'],
    ['closure', 'Closure', ['ebrc'], 'ebrc'],
  ],
  compliance: [
    ['invoice', 'Invoice', ['invoices'], 'invoices'],
    [
      'evidence',
      'Bank evidence',
      ['remittances', 'forex', 'receipts'],
      'remittances',
    ],
    ['certificate', 'eBRC', ['ebrc'], 'ebrc'],
    ['incentive', 'Incentive', ['incentives'], 'incentives'],
  ],
};
export function lifecycle(
  root: Entity,
  nodes: Entity[],
): { family: string; stages: Stage[]; next: any; status: string } {
  const active = nodes.filter((r) => !inactive(r));
  let family = 'sales';
  if (root.kind === 'machines') family = 'inventory';
  else if (
    [
      'purchase-orders',
      'purchase-invoices',
      'supplier-advances',
      'expenses',
      'purchase-invoices',
    ].includes(root.kind)
  )
    family = 'procurement';
  else if (['receipts', 'payments', 'remittances', 'forex'].includes(root.kind))
    family = 'finance';
  else if (['ebrc', 'incentives'].includes(root.kind)) family = 'compliance';
  else if (
    [
      'invoices',
      'shipping-bills',
      'bills-of-lading',
      'packing-lists',
      'shipments',
      'export-shipments',
    ].includes(root.kind) &&
    active.some((r) => r.kind === 'invoices')
  )
    family = 'export';
  if (
    ['customers', 'vendors', 'products', 'warehouses'].includes(root.kind) ||
    root.kind.startsWith('master-')
  )
    return {
      family: 'profile',
      stages: [],
      next: null,
      status: processState(root),
    };
  const checks = family === 'export' ? pendingFor(root, active) : [];
  const defs = family === 'export' ? exportStageDefs : familyStages[family];
  const stages: Stage[] = defs.map((d: any, index: number) => {
    const [key, label] = d,
      kinds: string[] = family === 'export' ? d[3] : d[2];
    const stageRecords = active.filter((r) => kinds.includes(r.kind));
    let evidence =
      family === 'export' ? checks.filter((c) => d[2].includes(c.key)) : [];
    if (family !== 'export') {
      let complete = stageRecords.some(
        (r) => !['Draft', 'Rejected', 'Cancelled'].includes(r.status),
      );
      if (family === 'inventory') {
        const serialState = String(root.status || '');
        if (key === 'stock')
          complete = [
            'Available',
            'Reserved',
            'Allocated',
            'Sold',
            'Shipped',
            'Delivered',
          ].includes(serialState);
        if (key === 'received')
          complete =
            complete ||
            [
              'Available',
              'Reserved',
              'Allocated',
              'Sold',
              'Shipped',
              'Delivered',
            ].includes(serialState);
        if (key === 'allocated')
          complete =
            complete ||
            ['Reserved', 'Allocated', 'Sold', 'Shipped', 'Delivered'].includes(
              serialState,
            );
        if (key === 'sold')
          complete =
            complete || ['Sold', 'Shipped', 'Delivered'].includes(serialState);
        if (key === 'delivered')
          complete = stageRecords.some((r) =>
            ['Delivered', 'Completed'].includes(r.status),
          );
      }
      if (family === 'finance' && key === 'bank')
        complete = active.some(
          (r) =>
            ['receipts', 'payments', 'remittances', 'forex'].includes(r.kind) &&
            !!(r.bankReference || r.utr || r.realisationDate),
        );
      evidence = [
        {
          key,
          label,
          complete,
          action: `Review ${label.toLowerCase()}`,
          owner:
            family === 'procurement'
              ? 'Purchase'
              : family === 'inventory'
                ? 'Inventory'
                : family === 'sales'
                  ? 'Sales'
                  : 'Finance',
        },
      ];
    }
    const task = active.find(
      (r) =>
        r.kind === 'tasks' &&
        !['Completed', 'Cancelled'].includes(r.status) &&
        evidence.some((c) => c.action === r.name),
    );
    return {
      key,
      label,
      status:
        evidence.length && evidence.every((c) => c.complete)
          ? 'Completed'
          : 'Awaiting',
      owner:
        task?.owner ||
        evidence.find((c) => !c.complete)?.owner ||
        (family === 'export' ? d[5] : family),
      requiredDocuments:
        family === 'export'
          ? d[2].filter((k: string) =>
              [
                'Shipping bill',
                'Bill of lading',
                'Packing list',
                'eBRC',
              ].includes(k),
            )
          : [],
      requiredFields: ['reference', 'date'],
      dependencies: index ? [defs[index - 1][0]] : [],
      dueDate: task?.dueDate || '',
      nextAction:
        evidence.find((c) => !c.complete)?.action || 'Review recorded evidence',
      exceptions: evidence.filter((c) => !c.complete).map((c) => c.label),
      recordIds: stageRecords.map((r) => r.id),
      checks: evidence,
      route: family === 'export' ? d[4] : d[3],
    };
  });
  const current = stages.find((s) => s.status !== 'Completed');
  if (current)
    current.status =
      current.dueDate && current.dueDate < new Date().toISOString().slice(0, 10)
        ? 'Overdue'
        : 'In progress';
  const status =
    inactive(root) || ['Draft', 'Blocked', 'Rejected'].includes(root.status)
      ? processState(root)
      : current
        ? 'In progress'
        : root.status === 'Closed'
          ? 'Closed'
          : 'Completed';
  return {
    family,
    stages,
    next:
      current && !inactive(root) && root.status !== 'Closed'
        ? { ...current, action: current.nextAction }
        : null,
    status,
  };
}
export function workspaceRows(records: Entity[], edges: Relationship[]) {
  return records
    .filter((r) =>
      [
        'invoices',
        'domestic-invoices',
        'quotations',
        'sales-orders',
        'proformas',
        'purchase-orders',
        'purchase-invoices',
      ].includes(r.kind),
    )
    .map((r) => {
      const nodes = transactionScope(r, records, edges),
        flow = lifecycle(r, nodes),
        party = records.find((p) => p.id === r.partnerId);
      if (
        ['quotations', 'sales-orders', 'proformas'].includes(r.kind) &&
        nodes.some(
          (n) =>
            ['invoices', 'domestic-invoices'].includes(n.kind) && !inactive(n),
        )
      )
        return null;
      return {
        id: r.id,
        reference: entityLabel(r),
        kind: r.kind,
        fy: r.fy,
        date: r.date,
        dataState: sourceState(r),
        status: flow.status,
        stage: flow.next?.label || flow.status,
        next: flow.next,
        party: r.customerName || r.supplierName || party?.name || '',
        amount: r.amount,
        currency: r.currency,
        totalUsd: r.totalUsd,
        stages: flow.stages,
      };
    })
    .filter((r): r is NonNullable<typeof r> => !!r);
}
