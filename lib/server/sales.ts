import {
  salesKinds,
  salesIssues,
  priceSales,
  quoteStates,
  safeSalesDocument,
} from '../sales-engine';
import { fiscalYear, validDate } from '../domain';
import { wordDocument } from './word-document';
const response = (data: any, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const decode = (r: any) => ({
  ...JSON.parse(r.data),
  id: r.id,
  kind: r.kind,
  version: r.version,
  created: r.created,
  fy: r.fy,
});
export async function sales(
  req: Request,
  path: string,
  b: any,
  u: any,
  db: any,
  bucket: any,
) {
  if (!['Admin', 'Finance', 'Viewer'].includes(u.role))
    return response(
      { error: 'Sales access is unavailable for this role.' },
      403,
    );
  const [, kind, rid, action] = path.split('/'),
    now = () => new Date().toISOString(),
    id = () => crypto.randomUUID();
  const all = (
    await db
      .prepare('SELECT * FROM records WHERE tenant_id=?')
      .bind(u.tenant_id)
      .all()
  ).results.map(decode);
  const find = (key: string) => all.find((r: any) => r.id === key);
  const audit = (name: string, k: string, key: string, detail: any) =>
    db
      .prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?,?)')
      .bind(
        id(),
        u.tenant_id,
        u.id,
        name,
        key,
        k,
        JSON.stringify(detail),
        now(),
      );
  const insert = (key: string, k: string, d: any) =>
    db
      .prepare(
        'INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)',
      )
      .bind(
        key,
        u.tenant_id,
        k,
        d.date ? fiscalYear(d.date) : 'master',
        JSON.stringify(d),
        now(),
      );
  const guard = (key: string, version: number) =>
    db
      .prepare(
        'INSERT INTO posting_guards VALUES(?,?,(SELECT version FROM records WHERE tenant_id=? AND id=?))',
      )
      .bind(id(), version, u.tenant_id, key);
  if (kind === 'lookups' && req.method === 'GET')
    return response({
      users: (
        await db
          .prepare('SELECT id,name FROM users WHERE tenant_id=? AND active=1')
          .bind(u.tenant_id)
          .all()
      ).results,
    });
  if (kind === 'draft') {
    if (u.role === 'Viewer')
      return response({ error: 'Read-only access.' }, 403);
    const draftId = `sales-draft:${u.tenant_id}:${u.id}:${rid}`;
    if (req.method === 'GET') return response(find(draftId) || null);
    if (req.method === 'POST') {
      const d = { payload: b.payload, updatedAt: now() };
      if (JSON.stringify(d).length > 150000)
        throw new Error('Draft is too large.');
      await db
        .prepare(
          "INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,'sales-draft','master',?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=version+1",
        )
        .bind(draftId, u.tenant_id, JSON.stringify(d), now())
        .run();
      return response({ savedAt: d.updatedAt });
    }
  }
  if (!salesKinds.includes(kind))
    return response({ error: 'Unknown sales document.' }, 404);
  if (req.method === 'GET' && !rid)
    return response(
      all
        .filter((r: any) => r.kind === kind)
        .map((r: any) => ({
          ...safeSalesDocument(r),
          status:
            ['Approved', 'Sent', 'Viewed'].includes(r.status) &&
            r.validUntil &&
            r.validUntil < now().slice(0, 10)
              ? 'Expired'
              : r.status,
        })),
    );
  const existing = rid ? find(rid) : null;
  if (rid && (!existing || existing.kind !== kind))
    return response({ error: 'Document not found.' }, 404);
  if (req.method === 'GET') {
    const events = (
      await db
        .prepare(
          'SELECT a.*,u.name actor FROM audit a LEFT JOIN users u ON u.id=a.user_id WHERE a.tenant_id=? AND a.record_id=? ORDER BY a.created DESC',
        )
        .bind(u.tenant_id, rid)
        .all()
    ).results;
    const connected = new Set<string>([rid]);
    for (let n = 0; n < 6; n++)
      for (const r of all)
        if (connected.has(r.sourceId) || connected.has(r.invoiceId))
          connected.add(r.id);
    return response({
      record: safeSalesDocument(existing),
      internal:
        u.role === 'Viewer'
          ? undefined
          : all.find(
              (r: any) => r.kind === 'sales-internal' && r.sourceId === rid,
            ),
      versions: all
        .filter(
          (r: any) =>
            salesKinds.includes(r.kind) &&
            (r.revisionRoot || r.id) === (existing.revisionRoot || existing.id),
        )
        .map(safeSalesDocument),
      related: all
        .filter(
          (r: any) =>
            connected.has(r.id) &&
            r.id !== rid &&
            ![
              'sales-internal',
              'sales-communication',
              'journal',
              'op-document',
              'sales-draft',
            ].includes(r.kind),
        )
        .map(safeSalesDocument),
      communications: all.filter(
        (r: any) => r.kind === 'sales-communication' && r.sourceId === rid,
      ),
      audit: events,
    });
  }
  if (req.method !== 'POST' || u.role === 'Viewer')
    return response({ error: 'Read-only access.' }, 403);
  if (existing && Number(b.version) !== existing.version)
    return response({ error: 'Document changed. Reload before saving.' }, 409);
  const reason = String(b.reason || '').trim();
  const update = (d: any) =>
    db
      .prepare(
        'UPDATE records SET data=?,fy=?,version=version+1 WHERE id=? AND tenant_id=?',
      )
      .bind(JSON.stringify(d), fiscalYear(d.date), rid, u.tenant_id);
  if (action === 'validate') return response({ issues: salesIssues(existing) });
  if (action === 'status') {
    if (!reason) throw new Error('Enter a reason for this action.');
    const state = existing.status || 'Draft',
      target = b.status;
    if (!(quoteStates[state] || []).includes(target))
      throw new Error('This lifecycle transition is not permitted.');
    if (['Approved', 'Returned'].includes(target) && u.role !== 'Admin')
      return response({ error: 'Administrator approval is required.' }, 403);
    if (['Under Review', 'Approved', 'Sent', 'Accepted'].includes(target)) {
      const issues = salesIssues(existing);
      if (issues.length)
        return response(
          { error: 'Resolve validation issues first.', issues },
          422,
        );
    }
    if (
      ['Sent', 'Accepted'].includes(target) &&
      existing.validUntil < now().slice(0, 10)
    )
      throw new Error('This document has expired. Create a revision.');
    if (target === 'Expired' && existing.validUntil >= now().slice(0, 10))
      throw new Error('The validity date has not passed.');
    const d = {
      ...existing,
      status: target,
      updatedAt: now(),
      updatedBy: u.name,
      [target === 'Approved'
        ? 'approvedAt'
        : target === 'Sent'
          ? 'sentAt'
          : target === 'Accepted'
            ? 'acceptedAt'
            : target === 'Rejected'
              ? 'rejectedAt'
              : 'statusChangedAt']: now(),
      ...(target === 'Approved' ? { approvedBy: u.name } : {}),
    };
    const statements = [
      guard(rid, existing.version),
      update(d),
      audit('Status changed', kind, rid, { from: state, to: target, reason }),
    ];
    if (['Sent', 'Viewed', 'Accepted', 'Rejected'].includes(target))
      statements.push(
        insert(id(), 'sales-communication', {
          sourceId: rid,
          type: target,
          channel: b.channel || 'Manual record',
          note: reason,
          actor: u.name,
          recordedAt: now(),
        }),
      );
    await db.batch(statements);
    return response({ id: rid });
  }
  if (action === 'revise') {
    if (
      ![
        'Approved',
        'Sent',
        'Viewed',
        'Accepted',
        'Rejected',
        'Expired',
      ].includes(existing.status) ||
      !reason
    )
      throw new Error(
        'Only issued or reviewed documents can be revised, with a reason.',
      );
    const key = id(),
      rev = (existing.revisionNumber || 1) + 1,
      d = {
        ...existing,
        id: undefined,
        version: undefined,
        status: 'Draft',
        reference: (existing.baseNumber || existing.reference) + `-R${rev}`,
        baseNumber: existing.baseNumber || existing.reference,
        revisionNumber: rev,
        revisionRoot: existing.revisionRoot || rid,
        previousVersionId: rid,
        approvedAt: undefined,
        approvedBy: undefined,
        sentAt: undefined,
        acceptedAt: undefined,
        rejectedAt: undefined,
        updatedAt: now(),
        createdBy: u.name,
      };
    const internal = all.find(
      (r: any) => r.kind === 'sales-internal' && r.sourceId === rid,
    );
    const statements = [
      guard(rid, existing.version),
      update({ ...existing, status: 'Revised', supersededBy: key }),
      insert(key, kind, d),
      audit('Revised', kind, rid, { nextId: key, reason }),
      audit('Created revision', kind, key, { previousId: rid, reason }),
    ];
    if (internal)
      statements.push(
        insert('sales-internal:' + key, 'sales-internal', {
          ...internal,
          id: undefined,
          sourceId: key,
        }),
      );
    await db.batch(statements);
    return response({ id: key }, 201);
  }
  if (action === 'convert') {
    const targets: Record<string, string[]> = {
      quotations: ['sales-orders', 'proformas'],
      'sales-orders': [
        'proformas',
        'invoices',
        'domestic-invoices',
        'delivery-challans',
      ],
      proformas: ['invoices', 'domestic-invoices'],
    };
    if (existing.status !== 'Accepted' || !targets[kind]?.includes(b.target))
      throw new Error(
        'Accept the document before converting it to an allowed destination.',
      );
    const key = id(),
      prefix: Record<string, string> = {
        'sales-orders': 'SO',
        proformas: 'PI',
        invoices: 'CI',
        'domestic-invoices': 'DI',
        'delivery-challans': 'DC',
      };
    const reference = await number(b.target, prefix[b.target]);
    const d = {
      ...safeSalesDocument(existing),
      id: undefined,
      version: undefined,
      reference,
      baseNumber: reference,
      status: 'Draft',
      sourceId: rid,
      revisionRoot: key,
      revisionNumber: 1,
      previousVersionId: undefined,
      approvedAt: undefined,
      approvedBy: undefined,
      sentAt: undefined,
      acceptedAt: undefined,
      salesEngine: b.target === 'delivery-challans' ? undefined : 2,
      date: now().slice(0, 10),
      createdBy: u.name,
      updatedAt: now(),
    };
    if (['invoices', 'domestic-invoices'].includes(b.target)) {
      const due = new Date(d.date + 'T00:00:00Z');
      due.setUTCDate(
        due.getUTCDate() + Number(find(d.paymentTermsId)?.days || 0),
      );
      d.dueDate = due.toISOString().slice(0, 10);
    }
    await db.batch([
      guard(rid, existing.version),
      update({ ...existing, status: 'Converted' }),
      insert(key, b.target, d),
      audit('Converted', kind, rid, { target: b.target, id: key }),
      audit('Created from source', b.target, key, { sourceId: rid }),
    ]);
    return response({ id: key, kind: b.target }, 201);
  }
  if (action === 'communication') {
    if (!reason) throw new Error('Enter a communication note.');
    await db.batch([
      insert(id(), 'sales-communication', {
        sourceId: rid,
        type: b.type || 'Note',
        channel: b.channel || 'Manual',
        note: reason,
        actor: u.name,
        recordedAt: now(),
      }),
      audit('Communication recorded', kind, rid, {
        type: b.type || 'Note',
        channel: b.channel || 'Manual',
      }),
    ]);
    return response({ id: rid });
  }
  if (action === 'document') {
    if (!bucket) throw new Error('File storage is unavailable.');
    const d = safeSalesDocument(existing),
      body = [
        `Reference: ${d.reference}`,
        `Date: ${d.date}`,
        `Customer: ${d.customerName || ''}`,
        `Billing address: ${d.billingAddress || ''}`,
        `Shipping address: ${d.shippingAddress || ''}`,
        `Valid until: ${d.validUntil || ''}`,
        `Subject: ${d.subject || ''}`,
        `Payment terms: ${find(d.paymentTermsId)?.name || ''}`,
        `Delivery terms: ${d.deliveryTerms || ''}`,
        `Expected delivery: ${d.expectedDelivery || ''}`,
        `Tax treatment: ${d.taxTreatment || ''}`,
        `Incoterm: ${find(d.shipmentTermsId)?.code || ''}`,
        `Loading port: ${find(d.loadingPortId)?.name || ''}`,
        `Discharge port: ${find(d.dischargePortId)?.name || ''}`,
        `Final destination: ${d.finalDestination || d.destinationCountry || ''}`,
        ...(d.lines || []).map(
          (l: any) =>
            `${l.description} | ${l.quantity} ${l.uom || ''} | ${(l.total / 100).toFixed(2)}`,
        ),
        `Total: ${d.currency || ''} ${(d.amount / 100).toFixed(2)}`,
        `Warranty: ${d.warranty || ''}`,
        d.validityText || '',
        d.taxClause || '',
        d.terms || '',
        d.customerNotes || '',
      ].join('\n');
    const bytes = wordDocument(d.reference, "Rohit's ERP", body),
      key = id(),
      objectKey = `${u.tenant_id}/${rid}/${key}`;
    await bucket.put(objectKey, bytes);
    await db.batch([
      insert(key, 'op-document', {
        entityId: rid,
        entityKind: kind,
        category:
          kind === 'quotations'
            ? 'Quotation'
            : kind === 'sales-orders'
              ? 'Sales order'
              : 'Invoice',
        filename: d.reference + '.docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: bytes.length,
        objectKey,
        documentVersion: d.revisionNumber || 1,
        status: 'Draft',
        generated: true,
        uploadedBy: u.name,
      }),
      audit('Generated customer document', kind, rid, {
        revision: d.revisionNumber || 1,
      }),
    ]);
    return response({ id: key }, 201);
  }
  if (action && action !== 'save') throw new Error('Unknown sales action.');
  if (existing && !['Draft', 'Returned'].includes(existing.status || 'Draft'))
    throw new Error('This version is locked. Create a revision to change it.');
  const d: any = {
    salesEngine: 2,
    operation: true,
    status: 'Draft',
    date: validDate(b.date || now().slice(0, 10)),
    quotationType: b.quotationType === 'Export' ? 'Export' : 'Domestic',
    createdBy: existing?.createdBy || u.name,
    updatedBy: u.name,
    updatedAt: now(),
    revisionNumber: existing?.revisionNumber || 1,
    revisionRoot: existing?.revisionRoot,
    sourceId: existing?.sourceId,
  };
  const fields = [
    'dueDate',
    'validUntil',
    'partnerId',
    'contactId',
    'salesPersonId',
    'customerReference',
    'enquiryId',
    'projectId',
    'subject',
    'billingAddress',
    'shippingAddress',
    'customerGstin',
    'currencyId',
    'paymentTermsId',
    'priceListId',
    'paymentMethod',
    'taxTreatment',
    'placeOfSupply',
    'gstSplit',
    'exchangeRate',
    'withholdingBase',
    'discountPolicy',
    'creditTerms',
    'freight',
    'insurance',
    'packing',
    'otherCharges',
    'roundOff',
    'shipmentTermsId',
    'loadingPortId',
    'dischargePortId',
    'originCountry',
    'destinationCountry',
    'shipmentMode',
    'transportMode',
    'warehouseId',
    'deliveryAddressId',
    'deliveryTerms',
    'expectedDelivery',
    'deliveryDate',
    'warranty',
    'validityText',
    'taxClause',
    'terms',
    'customerNotes',
    'bankId',
    'exportType',
    'finalDestination',
  ];
  for (const field of fields)
    d[field] = String(b[field] ?? '').slice(
      0,
      ['terms', 'customerNotes', 'billingAddress', 'shippingAddress'].includes(
        field,
      )
        ? 15000
        : 1000,
    );
  for (const [field, k] of [
    ['partnerId', 'customers'],
    ['currencyId', 'master-currency'],
    ['paymentTermsId', 'master-payment-terms'],
    ['priceListId', 'price-lists'],
    ['shipmentTermsId', 'master-shipment-terms'],
    ['loadingPortId', 'master-ports'],
    ['dischargePortId', 'master-ports'],
    ['warehouseId', 'warehouses'],
    ['deliveryAddressId', 'master-delivery-addresses'],
    ['bankId', 'master-bank-details'],
    ['projectId', 'sales-projects'],
    ['enquiryId', 'sales-enquiries'],
  ])
    if (
      d[field] &&
      (!find(d[field]) ||
        find(d[field]).kind !== k ||
        ['Inactive', 'Blocked'].includes(find(d[field]).status))
    )
      throw new Error('Invalid master selection: ' + field);
  if (
    d.salesPersonId &&
    !(await db
      .prepare('SELECT id FROM users WHERE id=? AND tenant_id=? AND active=1')
      .bind(d.salesPersonId, u.tenant_id)
      .first())
  )
    throw new Error('Select an active salesperson.');
  for (const key of ['deliveryAddressId', 'enquiryId', 'projectId'])
    if (
      d[key] &&
      find(d[key])?.customerId &&
      find(d[key]).customerId !== d.partnerId
    )
      throw new Error('Selected ' + key + ' belongs to a different customer.');
  const customer = find(d.partnerId);
  d.customerName = customer?.name || '';
  if (
    d.contactId &&
    !customer?.contacts?.some((c: any, i: number) => String(i) === d.contactId)
  )
    throw new Error('Select a contact for this customer.');
  if (['invoices', 'domestic-invoices'].includes(kind) && !d.dueDate) {
    const due = new Date(d.date + 'T00:00:00Z');
    due.setUTCDate(
      due.getUTCDate() + Number(find(d.paymentTermsId)?.days || 0),
    );
    d.dueDate = due.toISOString().slice(0, 10);
  }
  if (d.dueDate) validDate(d.dueDate);
  d.taxInclusive = !!b.taxInclusive;
  const priced = priceSales({
    ...d,
    lines: (b.lines || []).map((l: any) => {
      const t = find(l.taxCodeId);
      return {
        ...l,
        gstRate: t?.gstRate || '0',
        tcsRate: t?.tcsRate || '0',
        tdsRate: t?.tdsRate || '0',
      };
    }),
  });
  d.lines = priced.lines;
  if (d.lines.length) {
    d.lines[d.lines.length - 1].other = priced.totals.charges;
    d.lines[d.lines.length - 1].rounding = priced.totals.rounding;
  }
  d.totals = priced.totals;
  d.amount = priced.totals.total;
  d.currency = find(d.currencyId)?.code || '';
  for (const line of d.lines) {
    if (line.productId && find(line.productId)?.kind !== 'products')
      throw new Error('Select a valid product.');
    if (line.taxCodeId && find(line.taxCodeId)?.kind !== 'tax-codes')
      throw new Error('Select a valid tax code.');
    if (line.overrideEnabled && u.role !== 'Admin')
      throw new Error('Only an administrator may override tax amounts.');
  }
  const key = rid || id();
  d.reference =
    existing?.reference ||
    (await number(
      kind,
      {
        quotations: 'QUOT',
        'sales-orders': 'SO',
        proformas: 'PI',
        invoices: 'CI',
        'domestic-invoices': 'DI',
      }[kind] || 'DOC',
    ));
  d.baseNumber = existing?.baseNumber || d.reference;
  d.revisionRoot = existing?.revisionRoot || key;
  const statements = existing
    ? [guard(rid, existing.version), update(d)]
    : [insert(key, kind, d)];
  const internalId = `sales-internal:${key}`,
    internal = {
      sourceId: key,
      notes: String(b.internalNotes || '').slice(0, 15000),
      costing: b.internalCosting || {},
      updatedAt: now(),
    };
  if (JSON.stringify(internal).length > 30000)
    throw new Error('Internal costing is too large.');
  statements.push(
    db
      .prepare(
        "INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,'sales-internal','master',?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=version+1",
      )
      .bind(internalId, u.tenant_id, JSON.stringify(internal), now()),
    audit(existing ? 'Draft updated' : 'Draft created', kind, key, {
      reference: d.reference,
      reason,
      amount: d.amount,
      previousAmount: existing?.amount,
      changes: existing
        ? Object.keys(d)
            .filter(
              (k) =>
                !['id', 'version', 'updatedAt', 'updatedBy'].includes(k) &&
                JSON.stringify(existing[k]) !== JSON.stringify(d[k]),
            )
            .map((k) => ({ field: k, before: existing[k], after: d[k] }))
        : [],
      discount: d.totals.discount,
      overrides: d.lines
        .filter((l: any) => l.overrideEnabled)
        .map((l: any) => ({
          description: l.description,
          reason: l.overrideReason,
        })),
    }),
  );
  await db.batch(statements);
  return response({ id: key, issues: salesIssues(d) }, existing ? 200 : 201);
  async function number(k: string, prefix: string) {
    const date = validDate(b.date || now().slice(0, 10)),
      fy = fiscalYear(date),
      sequenceKey = `${u.tenant_id}:${k}:${fy}`;
    const row = await db
      .prepare(
        'INSERT INTO document_sequences(id,value) VALUES(?,1) ON CONFLICT(id) DO UPDATE SET value=value+1 RETURNING value',
      )
      .bind(sequenceKey)
      .first();
    return `${prefix}-${fy.replace('–', '-')}-${String(row.value).padStart(5, '0')}`;
  }
}
