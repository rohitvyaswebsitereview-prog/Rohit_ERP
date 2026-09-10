import { opMap } from './operations';
export type Entity = Record<string, any> & { id: string; kind: string };
export type Relationship = {
  id: string;
  source_id: string;
  target_id: string;
  source_type: string;
  target_type: string;
  relationship_type: string;
  status: string;
  origin: string;
  confidence: number;
  evidence: string;
  source_line: string;
  target_line: string;
};
export const relationshipTypes = [
  'CREATED_FROM',
  'CONVERTED_FROM',
  'CONVERTED_TO',
  'REFERENCES',
  'FULFILLS',
  'BILLED_BY',
  'PAID_BY',
  'SETTLED_BY',
  'SHIPPED_BY',
  'DOCUMENTED_BY',
  'COSTED_FROM',
  'SUPPLIED_BY',
  'ALLOCATED_TO',
  'GENERATES',
  'SUPPORTS',
  'RECONCILES_WITH',
  'REVISED_FROM',
  'REPLACES',
  'ATTACHED_TO',
  'SUPPLIED_ITEM',
  'SOLD_IN',
];
export const entityLabel = (r: any) =>
  r.originalReference || r.reference || r.name || r.number || r.id;
export const entityType = (k: string) =>
  opMap[k]?.label ||
  (
    {
      customers: 'Customer',
      vendors: 'Supplier',
      products: 'Product',
      journal: 'General ledger',
      documents: 'Document',
    } as any
  )[k] ||
  k;
const hubs = new Set([
  'customers',
  'vendors',
  'products',
  'warehouses',
  ...Object.keys(opMap).filter(
    (k) => opMap[k].master && !['machines', 'sales-projects'].includes(k),
  ),
]);
export function inferRelationships(records: Entity[]): Relationship[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const found = new Map<string, Relationship>();
  const add = (
    r: Entity,
    target: any,
    kind: string,
    evidence: string,
    status = 'Confirmed',
    line = '',
  ) => {
    const t = byId.get(String(target));
    if (!t || t.id === r.id) return;
    const id = [r.id, t.id, kind, line].map(encodeURIComponent).join('|');
    found.set(id, {
      id,
      source_id: r.id,
      target_id: t.id,
      source_type: r.kind,
      target_type: t.kind,
      relationship_type: kind,
      status,
      origin: 'record-reference',
      confidence: status === 'Confirmed' ? 1 : 0.6,
      evidence,
      source_line: line,
      target_line: '',
    });
  };
  for (const r of records) {
    for (const [field, type] of Object.entries({
      sourceId: 'CREATED_FROM',
      invoiceId: 'RECONCILES_WITH',
      salesInvoiceId: 'SOLD_IN',
      purchaseId: 'SUPPLIED_BY',
      partnerId: 'REFERENCES',
      customerId: 'REFERENCES',
      vendorId: 'SUPPLIED_BY',
      supplierId: 'SUPPLIED_BY',
      productId: 'REFERENCES',
      warehouseId: 'REFERENCES',
      receiptId: 'SETTLED_BY',
      remittanceId: 'SETTLED_BY',
      forexId: 'RECONCILES_WITH',
      bankId: 'REFERENCES',
      paymentId: 'PAID_BY',
      shipmentId: 'SHIPPED_BY',
      shippingBillId: 'DOCUMENTED_BY',
      projectId: 'ALLOCATED_TO',
      entityId: 'ATTACHED_TO',
      orderId: 'FULFILLS',
      advanceId: 'SETTLED_BY',
      originalId: 'REVISED_FROM',
    }))
      if (r[field] && !(field === 'invoiceId' && r.invoiceId === r.sourceId))
        add(r, r[field], type, `Explicit ${field}`);
    for (const f of opMap[r.kind]?.fields || [])
      if (
        f.type === 'reference' &&
        r[f.key] &&
        ![...found.values()].some(
          (e) =>
            e.source_id === r.id && e.target_id === r[f.key] && !e.source_line,
        )
      )
        add(r, r[f.key], 'REFERENCES', `Explicit ${f.label}`);
    for (const target of r.relatedIds || [])
      add(
        r,
        target,
        r.kind === 'purchase-invoices' ? 'COSTED_FROM' : 'REFERENCES',
        'Imported related reference; verify business allocation',
        'Derived',
      );
    for (const [i, line] of (r.lines || []).entries()) {
      for (const f of [
        'productId',
        'machineId',
        'purchaseId',
        'salesInvoiceId',
      ])
        if (line[f])
          add(
            r,
            line[f],
            f === 'purchaseId' ? 'COSTED_FROM' : 'ALLOCATED_TO',
            `Line ${i + 1}: ${f}`,
            'Confirmed',
            String(line.id || i + 1),
          );
      const serial = String(
        line.serialNumber || line.serialNumbers || '',
      ).trim();
      if (serial) {
        const matches = records.filter(
          (m) =>
            m.kind === 'machines' &&
            String(m.serialNumber || '').trim() === serial,
        );
        if (matches.length === 1)
          add(
            r,
            matches[0].id,
            'ALLOCATED_TO',
            `Exact unique serial on line ${i + 1}`,
            'Derived',
            String(line.id || i + 1),
          );
      }
    }
  }
  return [...found.values()];
}
export function connected(
  root: string,
  records: Entity[],
  edges: Relationship[],
) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const ids = new Set([root]);
  let frontier = [root];
  const usable = edges.filter((e) => e.status === 'Confirmed');
  const adjacency = new Map<string, string[]>();
  for (const e of usable) {
    for (const [a, b] of [
      [e.source_id, e.target_id],
      [e.target_id, e.source_id],
    ]) {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a)!.push(b);
    }
  }
  for (let depth = 0; depth < 7 && frontier.length; depth++) {
    const next: string[] = [];
    for (const current of frontier) {
      if (current !== root && hubs.has(byId.get(current)?.kind || '')) continue;
      for (const target of adjacency.get(current) || []) {
        if (target && !ids.has(target) && byId.has(target)) {
          ids.add(target);
          next.push(target);
        }
      }
    }
    frontier = next;
  }
  // Unconfirmed links are review candidates, never used to propagate financial lineage.
  const candidates = edges.filter(
    (e) =>
      e.status === 'Derived' && (ids.has(e.source_id) || ids.has(e.target_id)),
  );
  return {
    records: records.filter((r) => ids.has(r.id)),
    edges: edges.filter((e) => ids.has(e.source_id) && ids.has(e.target_id)),
    candidates,
  };
}
export const exportKinds = ['invoices', 'export-invoices'];
export const inactive = (r: any) =>
  ['Cancelled', 'Reversed', 'Rejected'].includes(r.status);
export function pendingFor(root: Entity, nodes: Entity[]) {
  const exports = nodes.filter(
    (r) => exportKinds.includes(r.kind) && !inactive(r),
  );
  if (!exports.length) return [];
  const documentCategory: Record<string, string> = {
    'packing-lists': 'packing list',
    'bills-of-lading': 'bl final',
    ebrc: 'ebrc',
  };
  const has = (k: string) =>
    nodes.some(
      (r) =>
        !inactive(r) &&
        (r.kind === k ||
          (r.kind === 'op-document' &&
            ['Final', 'Sent'].includes(r.status) &&
            documentCategory[k] &&
            String(r.category || '').toLowerCase() === documentCategory[k])),
    );
  const steps = [
    ['Invoice', true, 'Review commercial invoice', 'Sales'],
    [
      'Shipping bill',
      has('shipping-bills'),
      'Record shipping bill',
      'Export Documentation',
    ],
    [
      'Bill of lading',
      has('bills-of-lading') &&
        !exports.some((r) =>
          /BL AWAITED|CUSTOMER CHECK BL/i.test(r.sourceStatus || ''),
        ),
      'Obtain customer-approved bill of lading',
      'Export Documentation',
    ],
    [
      'Shipment completed',
      nodes.some(
        (r) => r.kind === 'shipping-bills' && !!r.egmNumber && !!r.egmDate,
      ) ||
        nodes.some(
          (r) =>
            ['shipments', 'export-shipments'].includes(r.kind) &&
            ['Delivered', 'Completed', 'Arrived'].includes(r.status),
        ),
      'Confirm export shipment completion',
      'Logistics',
    ],
    [
      'Customer receipt',
      exports.every((inv) => {
        const receipts = nodes.filter(
          (r) =>
            r.kind === 'receipts' &&
            !inactive(r) &&
            [r.sourceId, r.invoiceId].includes(inv.id),
        );
        const usd = Number(inv.totalUsd || 0);
        return usd > 0
          ? receipts
              .filter((r) => r.currency === 'USD')
              .reduce(
                (s, r) => s + Number(r.settledAmount ?? r.amount ?? 0),
                0,
              ) >= Math.round(usd * 100)
          : receipts
              .filter((r) => (r.currency || 'INR') === (inv.currency || 'INR'))
              .reduce((s, r) => s + Number(r.amount || 0), 0) >=
              Number(inv.amount || Infinity);
      }),
      'Reconcile customer receipts',
      'Finance',
    ],
    [
      'Bank realisation',
      nodes.some(
        (r) =>
          ['receipts', 'remittances', 'forex'].includes(r.kind) &&
          !!(r.bankReference || r.utr || r.realisationDate),
      ),
      'Record bank realisation evidence',
      'Finance',
    ],
    [
      'Forex reference',
      has('forex'),
      'Record linked forex conversion',
      'Finance',
    ],
    [
      'Packing list',
      has('packing-lists'),
      'Attach packing list',
      'Export Documentation',
    ],
    ['eBRC', has('ebrc'), 'Obtain and record bank-issued eBRC', 'Finance'],
  ];
  const result = steps.map(([label, complete, action, owner]) => ({
    key: String(label),
    label: String(label),
    complete: !!complete,
    action: String(action),
    owner: String(owner),
  }));
  for (const scheme of ['DBK', 'RoDTEP', 'IGST refund']) {
    const inc = nodes.filter(
      (r) => r.kind === 'incentives' && r.scheme === scheme && !inactive(r),
    );
    if (inc.some((r) => Number(r.amount) > 0))
      result.push({
        key: scheme,
        label: scheme,
        complete: inc.every(
          (r) =>
            Math.round(Number(r.receivedAmount || 0) * 100) >= Number(r.amount),
        ),
        action: `Reconcile ${scheme} claim and receipts`,
        owner: 'Finance',
      });
  }
  return result;
}
export function timelineFor(nodes: Entity[]) {
  const events: any[] = [];
  for (const r of nodes) {
    if (r.date)
      events.push({
        date: r.date,
        label: entityType(r.kind) + ' recorded',
        recordId: r.id,
        reference: entityLabel(r),
        evidence: r.importLocked
          ? 'Source transaction date'
          : 'Transaction date',
      });
    for (const [field, label] of Object.entries({
      receivedDate: 'Receipt received',
      paymentDate: 'Payment recorded',
      realisationDate: 'Bank realisation',
      departureDate: 'Shipment departed',
      arrivalDate: 'Shipment arrived',
      etd: 'Expected departure',
      eta: 'Expected arrival',
      egmDate: 'EGM recorded',
      dueDate: 'Due',
      claimDate: 'Claim filed',
    }))
      if (r[field])
        events.push({
          date: r[field],
          label,
          recordId: r.id,
          reference: entityLabel(r),
          evidence: field,
        });
  }
  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label),
  );
}

export function exportScope(
  root: string,
  records: Entity[],
  edges: Relationship[],
) {
  const blocked = new Set(
    records
      .filter(
        (r) =>
          r.id !== root &&
          (hubs.has(r.kind) ||
            [
              'invoices',
              'domestic-invoices',
              'purchase-invoices',
              'expenses',
              'machines',
            ].includes(r.kind)),
      )
      .map((r) => r.id),
  );
  return connected(
    root,
    records.filter((r) => !blocked.has(r.id)),
    edges,
  );
}
