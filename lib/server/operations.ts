import { wordDocument } from './word-document';
import {
  opMap,
  operationModules,
  permittedOperation,
  initialStatus,
  calculateLines,
} from '../operations';
import { fiscalYear, validDate, moneyMinor, assertBalanced } from '../domain';
const json = (data: any, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
const parse = (r: any) => ({
  ...JSON.parse(r.data),
  id: r.id,
  kind: r.kind,
  version: r.version,
  created: r.created,
  fy: r.fy,
});
const clean = (v: any, max = 2000) =>
  String(v ?? '')
    .trim()
    .slice(0, max);
const today = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();
const references: Record<string, string[]> = {
  'approval-source': operationModules
    .filter((m) => m.posting)
    .map((m) => m.key),
  'sales-invoice': ['invoices', 'domestic-invoices'],
  'purchase-payable': ['purchase-invoices', 'expenses', 'bills'],
  'delivery-source': [
    'sales-orders',
    'invoices',
    'domestic-invoices',
    'purchase-invoices',
  ],
};
export async function operations(
  req: Request,
  path: string,
  b: any,
  u: any,
  db: any,
  bucket: any,
): Promise<Response> {
  const url = new URL(req.url);
  const parts = path.split('/');
  const kind = parts[1],
    rid = parts[2],
    action = parts[3];
  const rawAll = await db
    .prepare('SELECT * FROM records WHERE tenant_id=? ORDER BY created DESC')
    .bind(u.tenant_id)
    .all();
  const all = rawAll.results.map(parse);
  const visible = (r: any) =>
    opMap[r.kind] && permittedOperation(opMap[r.kind], u.role);
  const redact = (r: any) => {
    if (u.role === 'Logistics') {
      const out = { ...r };
      for (const k of [
        'cost',
        'amount',
        'defaultRate',
        'creditLimit',
        'accountNumber',
        'bankAccounts',
        'bankName',
        'pan',
        'gstin',
        'currency',
      ])
        delete out[k];
      return out;
    }
    if (u.role !== 'Viewer') return r;
    const out = { ...r };
    if (out.bankAccounts)
      out.bankAccounts = out.bankAccounts.map((a: any) => ({
        ...a,
        number: '••••' + String(a.number || '').slice(-4),
      }));
    for (const k of [
      'accountNumber',
      'pan',
      'gstin',
      'customerGstin',
      'taxRegistrations',
    ])
      if (out[k]) out[k] = '••••' + String(out[k]).slice(-4);
    return out;
  };
  const event = (name: string, k: string, id: string, detail: any) =>
    db
      .prepare('INSERT INTO audit VALUES (?,?,?,?,?,?,?,?)')
      .bind(
        makeId(),
        u.tenant_id,
        u.id,
        name,
        id,
        k,
        JSON.stringify(detail),
        today(),
      );
  const saveNew = (k: string, data: any, id = makeId()) =>
    db
      .prepare(
        'INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)',
      )
      .bind(
        id,
        u.tenant_id,
        k,
        opMap[k]?.master
          ? 'master'
          : data.date
            ? fiscalYear(data.date)
            : 'master',
        JSON.stringify(data),
        today(),
      );
  const find = (id: string, k?: string) =>
    all.find((r: any) => r.id === id && (!k || r.kind === k));
  if (kind === 'stock' && req.method === 'GET') {
    if (!['Admin', 'Finance', 'Viewer', 'Logistics'].includes(u.role))
      return json({ error: 'Access denied.' }, 403);
    return json(
      (
        await db
          .prepare('SELECT * FROM stock_balances WHERE tenant_id=?')
          .bind(u.tenant_id)
          .all()
      ).results.map((r: any) =>
        u.role === 'Logistics' ? { ...r, value: undefined } : r,
      ),
    );
  }
  if (kind === 'permissions' && req.method === 'GET') {
    if (u.role !== 'Admin')
      return json({ error: 'Administrator access required.' }, 403);
    return json(
      operationModules.map((m) => ({ module: m.label, roles: m.roles })),
    );
  }
  if (kind === 'security') {
    if (u.role !== 'Admin')
      return json({ error: 'Administrator access required.' }, 403);
    if (req.method === 'GET')
      return json(
        (
          await db
            .prepare(
              'SELECT u.id,u.name,u.email,u.role,u.active,COUNT(s.token) sessions,MAX(s.expires) expires FROM users u LEFT JOIN sessions s ON s.user_id=u.id AND s.expires>? WHERE u.tenant_id=? GROUP BY u.id',
            )
            .bind(Date.now(), u.tenant_id)
            .all()
        ).results,
      );
    if (req.method === 'POST' && rid && action === 'revoke') {
      const target = await db
        .prepare('SELECT id FROM users WHERE id=? AND tenant_id=?')
        .bind(rid, u.tenant_id)
        .first();
      if (!target) return json({ error: 'User not found.' }, 404);
      await db.batch([
        db.prepare('DELETE FROM sessions WHERE user_id=?').bind(rid),
        event('Sessions revoked', 'users', rid, { reason: clean(b.reason) }),
      ]);
      return json({ ok: true });
    }
    return json({ error: 'Action unavailable.' }, 400);
  }
  if (kind === 'catalogue' && req.method === 'GET')
    return json(operationModules.filter((m) => permittedOperation(m, u.role)));
  if (kind === 'data' && req.method === 'GET')
    return json(all.filter(visible).map(redact));
  if (kind === 'documents' && req.method === 'GET') {
    const docs = all.filter(
      (r: any) =>
        r.kind === 'op-document' &&
        find(r.entityId) &&
        visible(find(r.entityId)),
    );
    if (rid) {
      const doc = docs.find((r: any) => r.id === rid);
      if (!doc) return json({ error: 'Document not found.' }, 404);
      const file = await bucket?.get(doc.objectKey);
      if (!file) return json({ error: 'File is unavailable.' }, 404);
      return new Response(file.body, {
        headers: {
          'Content-Type': doc.mime,
          'Content-Disposition': `attachment; filename="${doc.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      });
    }
    return json(docs.map(({ objectKey, ...r }: any) => r));
  }
  const m = opMap[kind];
  if (!m || !permittedOperation(m, u.role))
    return json({ error: 'Page unavailable for your role.' }, 403);
  if (req.method === 'GET' && !rid)
    return json(all.filter((r: any) => r.kind === kind).map(redact));
  const existing = rid ? find(rid, kind) : null;
  if (rid && !existing) return json({ error: 'Record not found.' }, 404);
  if (req.method === 'GET') {
    const history = await db
      .prepare(
        'SELECT a.*,u.name actor FROM audit a LEFT JOIN users u ON a.user_id=u.id WHERE a.tenant_id=? AND a.record_id=? ORDER BY a.created DESC',
      )
      .bind(u.tenant_id, rid)
      .all();
    const documents = all
      .filter((r: any) => r.kind === 'op-document' && r.entityId === rid)
      .map(({ objectKey, ...r }: any) => r);
    return json({
      record: redact(existing),
      audit: ['Viewer', 'Logistics'].includes(u.role)
        ? history.results.map((r: any) => ({
            ...r,
            detail: 'Details restricted to authorised editors.',
          }))
        : history.results,
      documents,
      related: all
        .filter(
          (r: any) =>
            visible(r) &&
            (r.sourceId === rid ||
              r.invoiceId === rid ||
              r.advanceId === rid ||
              r.partnerId === rid ||
              r.productId === rid ||
              r.purchaseId === rid ||
              r.id === existing.sourceId ||
              r.id === existing.invoiceId ||
              r.id === existing.advanceId),
        )
        .map(redact),
    });
  }
  if (
    existing?.importLocked &&
    req.method === 'POST' &&
    !['document', 'print', 'email-draft'].includes(action || '')
  )
    return json(
      {
        error:
          'Historical source records are locked to prevent duplicate posting.',
      },
      409,
    );
  if (
    existing?.salesEngine === 2 &&
    action === 'status' &&
    b.status === 'Posted' &&
    existing.status !== 'Accepted'
  )
    return json(
      { error: 'Complete sales approval and acceptance before posting.' },
      409,
    );
  if (
    existing?.salesEngine === 2 &&
    req.method === 'POST' &&
    !['document', 'print', 'email-draft', 'generate'].includes(action || '') &&
    !(
      action === 'status' &&
      ['invoices', 'domestic-invoices'].includes(kind) &&
      ['Posted', 'Reversed'].includes(b.status)
    )
  )
    return json(
      {
        error: 'Use the sales document lifecycle. Issued versions are locked.',
      },
      409,
    );
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  if (action === 'print' || action === 'email-draft') {
    await event(
      action === 'print' ? 'Printed' : 'Email draft prepared',
      kind,
      rid,
      { reference: existing.reference || existing.name },
    ).run();
    return json({ ok: true });
  }
  if (!permittedOperation(m, u.role, true))
    return json({ error: 'Your role has read-only access.' }, 403);
  if (action === 'generate') {
    if (!bucket)
      return json({ error: 'Document storage is unavailable.' }, 503);
    const template = find(b.templateId, 'master-document-templates');
    if (!template || !['Active', 'Published'].includes(template.status))
      throw new Error('Select an active published template.');
    const values: Record<string, string> = {
      reference: existing.reference || existing.name,
      date: existing.date || '',
      company:
        all.find(
          (r: any) =>
            r.kind === 'master-company-information' && r.status === 'Active',
        )?.name || "Rohit's ERP",
      total: existing.amount
        ? `${existing.currency} ${(existing.amount / 100).toFixed(2)}`
        : '',
      customer: find(existing.partnerId)?.name || '',
      lines: (existing.lines || [])
        .map(
          (l: any) =>
            `${l.description} | ${l.quantity} | ${(l.total / 100).toFixed(2)}`,
        )
        .join('\n'),
    };
    const missing = new Set<string>();
    const output = String(template.body).replace(
      /\{\{\s*([a-zA-Z]+)\s*\}\}/g,
      (_: string, key: string) => {
        if (!values[key]) missing.add(key);
        return values[key] || '';
      },
    );
    if (missing.size)
      throw new Error('Missing template values: ' + [...missing].join(', '));
    const did = makeId(),
      objectKey = `${u.tenant_id}/${rid}/${did}`,
      filename =
        (existing.reference || existing.name).replace(/[^a-zA-Z0-9_-]/g, '_') +
        '.docx';
    const generatedBytes = wordDocument(
      template.documentType,
      values.company,
      output,
    );
    await bucket.put(objectKey, generatedBytes, {
      httpMetadata: {
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });
    try {
      await db.batch([
        saveNew(
          'op-document',
          {
            entityId: rid,
            entityKind: kind,
            category: template.documentType,
            filename,
            mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: generatedBytes.length,
            objectKey,
            documentVersion:
              all.filter(
                (r: any) =>
                  r.kind === 'op-document' &&
                  r.entityId === rid &&
                  r.templateId === template.id,
              ).length + 1,
            status: 'Draft',
            uploadedBy: u.name,
            generated: true,
            templateId: template.id,
            templateVersion: template.version,
          },
          did,
        ),
        event('Generated document', kind, rid, {
          templateId: template.id,
          templateVersion: template.version,
          filename,
        }),
      ]);
    } catch (e) {
      await bucket.delete(objectKey);
      throw e;
    }
    return json({ id: did }, 201);
  }
  if (action === 'document') {
    if (!bucket)
      return json({ error: 'Document storage is unavailable.' }, 503);
    const category = clean(b.category, 100),
      filename = clean(b.filename, 200),
      mime = clean(b.mime, 100);
    if (
      !category ||
      !filename ||
      ![
        'application/pdf',
        'image/jpeg',
        'image/png',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ].includes(mime)
    )
      throw new Error(
        'Choose a PDF, PNG, JPEG, text, CSV, Word or Excel file and category.',
      );
    if (typeof b.content !== 'string' || b.content.length > 7000000)
      throw new Error('Files must be smaller than 5 MB.');
    const bytes = Uint8Array.from(atob(b.content), (c) => c.charCodeAt(0));
    if (bytes.length > 5 * 1024 * 1024 || !bytes.length)
      throw new Error('Select a non-empty file up to 5 MB.');
    const did = makeId(),
      objectKey = `${u.tenant_id}/${rid}/${did}`;
    const version =
      all.filter(
        (r: any) =>
          r.kind === 'op-document' &&
          r.entityId === rid &&
          r.category === category,
      ).length + 1;
    await bucket.put(objectKey, bytes, { httpMetadata: { contentType: mime } });
    try {
      await db.batch([
        saveNew(
          'op-document',
          {
            entityId: rid,
            entityKind: kind,
            category,
            filename,
            mime,
            size: bytes.length,
            objectKey,
            documentVersion: version,
            tags: clean(b.tags),
            status: ['Draft', 'Final', 'Sent'].includes(b.status)
              ? b.status
              : 'Draft',
            uploadedBy: u.name,
          },
          did,
        ),
        event('Uploaded', kind, rid, { filename, category, version }),
      ]);
    } catch (e) {
      await bucket.delete(objectKey);
      throw e;
    }
    return json({ id: did }, 201);
  }
  if (existing && Number(b.version) !== existing.version)
    return json(
      { error: 'This record changed. Reload it before saving.' },
      409,
    );
  const reason = clean(b.reason);
  if (existing && !reason) throw new Error('Enter a reason for this change.');
  const conditionalAudit = (name: string, detail: any) =>
    db
      .prepare('INSERT INTO audit SELECT ?,?,?,?,?,?,?,? WHERE changes()=1')
      .bind(
        makeId(),
        u.tenant_id,
        u.id,
        name,
        rid,
        kind,
        JSON.stringify(detail),
        today(),
      );
  const update = async (data: any, name: string, detail: any) => {
    const result = await db.batch([
      db
        .prepare(
          'UPDATE records SET data=?,version=version+1 WHERE id=? AND tenant_id=? AND version=?',
        )
        .bind(
          JSON.stringify({ ...data, updatedAt: today(), updatedBy: u.name }),
          rid,
          u.tenant_id,
          existing.version,
        ),
      conditionalAudit(name, detail),
    ]);
    if (!result[0].meta.changes)
      return json({ error: 'Record changed. Reload before saving.' }, 409);
    return json({ id: rid });
  };
  if (action === 'status') {
    const status = clean(b.status, 80),
      current = existing.status || initialStatus(m);
    const transitions = m.posting
      ? {
          Draft: ['Posted', 'Cancelled'],
          Accepted: ['Posted'],
          Posted: ['Reversed'],
          Reversed: [],
          Cancelled: [],
        }
      : m.transitions;
    if (!(transitions[current] || []).includes(status))
      throw new Error('This status change is not allowed.');
    if (
      m.key === 'master-currency' &&
      ['INR', 'USD'].includes(existing.code) &&
      status !== 'Active'
    )
      throw new Error('INR and USD are protected currencies.');
    const dependents = all.filter(
      (r: any) =>
        opMap[r.kind] &&
        (r.sourceId === rid ||
          r.invoiceId === rid ||
          r.advanceId === rid ||
          r.partnerId === rid ||
          r.productId === rid ||
          r.currencyId === rid ||
          r.paymentTermsId === rid ||
          r.shipmentTermsId === rid),
    );
    if (
      [
        'Cancelled',
        'Reversed',
        'Inactive',
        'Blocked',
        'Customs Cancelled',
      ].includes(status) &&
      dependents.some(
        (r: any) => !['Cancelled', 'Reversed', 'Inactive'].includes(r.status),
      )
    )
      throw new Error(
        'Active related records exist. Close or reverse those records first.',
      );
    if (
      kind === 'shipping-bills' &&
      status === 'Assessed' &&
      !existing.assessedDate
    )
      throw new Error('Enter the assessed date before assessment.');
    if (
      kind === 'shipping-bills' &&
      status === 'LEO' &&
      (!existing.leoDate ||
        !all.some(
          (r: any) =>
            r.kind === 'op-document' &&
            r.entityId === rid &&
            r.category === 'LEO copy',
        ))
    )
      throw new Error('Enter the LEO date and upload the LEO copy first.');
    if (
      kind === 'shipping-bills' &&
      status === 'EGM' &&
      (!existing.egmNumber || !existing.egmDate)
    )
      throw new Error('Enter the EGM number and date first.');
    if (
      kind === 'approvals' &&
      status === 'Approved' &&
      find(existing.sourceId)?.version !== existing.documentVersion
    )
      throw new Error(
        'The source document changed. Submit a new approval request.',
      );
    if (kind === 'approvals' && u.role !== 'Admin')
      throw new Error('Only an administrator may approve or reject requests.');
    if (m.posting && status === 'Posted' && u.role !== 'Admin') {
      const rules = all.filter(
        (r: any) =>
          r.kind === 'approval-rules' &&
          r.status === 'Active' &&
          r.module === kind &&
          r.currencyId === existing.currencyId &&
          Number(r.threshold) * 100 <= existing.amount,
      );
      if (
        rules.length &&
        !all.some(
          (r: any) =>
            r.kind === 'approvals' &&
            r.sourceId === rid &&
            r.status === 'Approved' &&
            r.documentVersion === existing.version,
        )
      )
        throw new Error(
          'Administrator approval is required for this document version. Create an Approval Request first.',
        );
    }
    if (m.posting && ['Posted', 'Reversed'].includes(status)) {
      let journal: any;
      const stockStatements: any[] = [];
      const stockJournal: any[] = [];
      if (status === 'Posted') {
        for (const field of m.fields)
          if (field.required && !existing[field.key])
            throw new Error(`${field.label} is required before posting.`);
      }
      if (status === 'Reversed') {
        const original = find(rid + '-posting', 'journal');
        if (!original) throw new Error('Original posting is unavailable.');
        journal = {
          ...original,
          lines: original.lines.map((l: any) => ({
            ...l,
            debit: l.credit,
            credit: l.debit,
          })),
          memo: `Reversal: ${existing.reference}`,
          date: today().slice(0, 10),
        };
      } else {
        const amount = existing.amount;
        if (!Number.isSafeInteger(amount) || amount <= 0)
          throw new Error('Document amount must be positive.');
        if (
          [
            'receipt',
            'payment',
            'customer-adjustment',
            'supplier-adjustment',
          ].includes(m.posting)
        ) {
          const invoice = find(existing.invoiceId);
          if (
            !invoice ||
            invoice.status !== 'Posted' ||
            invoice.partnerId !== existing.partnerId ||
            invoice.currency !== existing.currency
          )
            throw new Error(
              'Select a posted invoice for the same partner and currency.',
            );
          const allocated = all
            .filter(
              (r: any) =>
                r.invoiceId === invoice.id &&
                r.status === 'Posted' &&
                [
                  'receipts',
                  'payments',
                  'customer-advance-adjustments',
                  'supplier-advance-adjustments',
                ].includes(r.kind),
            )
            .reduce((s: number, r: any) => s + r.amount, 0);
          if (allocated + amount > invoice.amount)
            throw new Error('Payment exceeds the remaining invoice balance.');
        }
        if (existing.advanceId) {
          const advance = find(existing.advanceId);
          if (
            !advance ||
            advance.status !== 'Posted' ||
            advance.partnerId !== existing.partnerId ||
            advance.currency !== existing.currency
          )
            throw new Error(
              'Select a posted advance for the same partner and currency.',
            );
          const used = all
            .filter(
              (r: any) => r.advanceId === advance.id && r.status === 'Posted',
            )
            .reduce((s: number, r: any) => s + r.amount, 0);
          if (used + amount > advance.amount)
            throw new Error(
              'Adjustment or refund exceeds the remaining advance balance.',
            );
        }
        const sale = m.posting === 'sale',
          purchase = m.posting === 'purchase',
          expense = m.posting === 'expense';
        let lines: any[] = [];
        if (sale || purchase || expense) {
          if (!existing.lines?.length)
            throw new Error(
              'Edit this document and add its item lines before posting.',
            );
          const total = (field: string) =>
            existing.lines.reduce(
              (s: number, l: any) => s + (l[field] || 0),
              0,
            );
          const base = total('basic') + total('other') + total('rounding'),
            gst = total('gst'),
            tcs = total('tcs'),
            tds = total('tds');
          if (base <= 0)
            throw new Error('Basic value including charges must be positive.');
          lines = sale
            ? [
                { account: '1100', debit: amount, credit: 0 },
                { account: '4000', debit: 0, credit: base },
                { account: '2100', debit: 0, credit: gst },
                { account: '2120', debit: 0, credit: tcs },
                { account: '1320', debit: tds, credit: 0 },
              ]
            : [
                { account: purchase ? '1200' : '6000', debit: base, credit: 0 },
                { account: '1300', debit: gst, credit: 0 },
                { account: '1310', debit: tcs, credit: 0 },
                { account: '2110', debit: 0, credit: tds },
                { account: '2000', debit: 0, credit: amount },
              ];
        } else {
          const pair: Record<string, string[]> = {
            receipt: ['1000', '1100'],
            payment: ['2000', '1000'],
            'supplier-advance': ['1400', '1000'],
            'customer-advance': ['1000', '2200'],
            'customer-adjustment': ['2200', '1100'],
            'supplier-adjustment': ['2000', '1400'],
            'customer-refund': ['2200', '1000'],
            'supplier-refund': ['1000', '1400'],
          };
          const [debit, credit] = pair[m.posting];
          lines = [
            { account: debit, debit: amount, credit: 0 },
            { account: credit, debit: 0, credit: amount },
          ];
        }
        lines = lines.filter((l) => l.debit || l.credit);
        assertBalanced(lines);
        journal = {
          date: existing.date,
          reference: existing.reference,
          currency: existing.currency,
          status: 'Posted',
          memo: `${m.label}: ${existing.reference}`,
          sourceId: rid,
          lines,
        };
      }
      if (['purchase', 'sale'].includes(m.posting)) {
        const stockLines =
          status === 'Reversed'
            ? all.filter(
                (r: any) =>
                  r.kind === 'movements' &&
                  r.sourceId === rid &&
                  r.operationStock,
              )
            : existing.lines.filter((l: any) => l.productId);
        const used = new Set<string>();
        for (const [i, line] of stockLines.entries()) {
          const productId = line.productId,
            warehouseId = existing.warehouseId;
          if (!warehouseId)
            throw new Error('Select a warehouse before posting stock.');
          const key = productId + '|' + warehouseId;
          if (used.has(key))
            throw new Error(
              'Combine repeated products into one line before posting.',
            );
          used.add(key);
          const quantity =
            status === 'Reversed'
              ? Number(line.quantity)
              : Number(line.quantity);
          if (!Number.isSafeInteger(quantity) || quantity <= 0)
            throw new Error('Stock quantities must be positive whole units.');
          const inward =
            status === 'Reversed'
              ? line.direction === 'Issue'
              : m.posting === 'purchase';
          const bal = await db
            .prepare(
              'SELECT * FROM stock_balances WHERE tenant_id=? AND product_id=? AND warehouse_id=? AND currency=?',
            )
            .bind(u.tenant_id, productId, warehouseId, existing.currency)
            .first();
          let value =
            status === 'Reversed'
              ? line.stockValue
              : m.posting === 'purchase'
                ? line.basic + line.other + line.rounding
                : bal && bal.quantity
                  ? Math.round((bal.value * quantity) / bal.quantity)
                  : 0;
          if (!inward && (!bal || bal.quantity < quantity))
            throw new Error(
              'Insufficient stock for ' + (line.description || productId) + '.',
            );
          if (inward) {
            stockStatements.push(
              db
                .prepare(
                  'INSERT INTO stock_balances(tenant_id,product_id,warehouse_id,currency,quantity,value) VALUES(?,?,?,?,?,?) ON CONFLICT(tenant_id,product_id,warehouse_id,currency) DO UPDATE SET quantity=quantity+excluded.quantity,value=value+excluded.value,version=version+1',
                )
                .bind(
                  u.tenant_id,
                  productId,
                  warehouseId,
                  existing.currency,
                  quantity,
                  value,
                ),
            );
          } else {
            stockStatements.push(
              db
                .prepare(
                  'UPDATE stock_balances SET quantity=CASE WHEN version=? THEN quantity-? ELSE -1 END,value=value-?,version=version+1 WHERE tenant_id=? AND product_id=? AND warehouse_id=? AND currency=?',
                )
                .bind(
                  bal.version,
                  quantity,
                  value,
                  u.tenant_id,
                  productId,
                  warehouseId,
                  existing.currency,
                ),
            );
          }
          stockStatements.push(
            saveNew(
              'movements',
              {
                date: journal.date,
                reference:
                  existing.reference +
                  ' ' +
                  (status === 'Reversed' ? 'reversal' : 'stock') +
                  ' ' +
                  (i + 1),
                sourceId: rid,
                operationStock: true,
                productId,
                warehouseId,
                quantity,
                direction: inward ? 'Receipt' : 'Issue',
                stockValue: value,
                currency: existing.currency,
                reason,
                status: 'Posted',
              },
              `${rid}-stock-${status}-${i}`,
            ),
          );
          if (m.posting === 'sale') {
            const machines = all.filter(
              (r: any) =>
                r.kind === 'machines' &&
                r.productId === productId &&
                r.warehouseId === warehouseId,
            );
            let selectedMachines: any[] = [];
            if (
              status === 'Posted' &&
              machines.some((r: any) =>
                ['Available', 'Reserved'].includes(r.status),
              )
            ) {
              const serials = String(line.serialNumbers || '')
                .split(/[\n,]+/)
                .map((v) => v.trim())
                .filter(Boolean);
              if (
                serials.length !== quantity ||
                new Set(serials).size !== quantity
              )
                throw new Error(
                  'Specify one serial number for each serialized machine sold.',
                );
              selectedMachines = serials.map((serial) => {
                const machine = machines.find(
                  (r: any) =>
                    r.serialNumber === serial && r.status === 'Available',
                );
                if (!machine)
                  throw new Error(
                    'Serial ' +
                      serial +
                      ' is not available in the dispatch warehouse.',
                  );
                return machine;
              });
            } else if (status === 'Reversed')
              selectedMachines = machines.filter(
                (r: any) => r.saleId === rid && r.status === 'Sold',
              );
            for (const machine of selectedMachines) {
              stockStatements.push(
                db
                  .prepare(
                    'INSERT INTO posting_guards(id,expected,actual) VALUES(?,?,(SELECT version FROM records WHERE id=? AND tenant_id=?))',
                  )
                  .bind(
                    rid + '-' + status + '-' + machine.id,
                    machine.version,
                    machine.id,
                    u.tenant_id,
                  ),
                db
                  .prepare(
                    'UPDATE records SET data=?,version=version+1 WHERE id=? AND tenant_id=?',
                  )
                  .bind(
                    JSON.stringify({
                      ...machine,
                      status: status === 'Posted' ? 'Sold' : 'Available',
                      saleId: status === 'Posted' ? rid : '',
                      updatedBy: u.name,
                      updatedAt: today(),
                    }),
                    machine.id,
                    u.tenant_id,
                  ),
                event('Stock status changed', 'machines', machine.id, {
                  sourceId: rid,
                  status,
                  reason,
                }),
              );
            }
          }
          if (status === 'Posted' && m.posting === 'sale' && value) {
            stockJournal.push(
              { account: '5000', debit: value, credit: 0 },
              { account: '1200', debit: 0, credit: value },
            );
          }
          if (
            status === 'Posted' &&
            m.posting === 'purchase' &&
            line.serialNumbers
          ) {
            const serials = line.serialNumbers
              .split(/[\n,]+/)
              .map((v: string) => v.trim())
              .filter(Boolean);
            if (
              serials.length !== quantity ||
              new Set(serials).size !== quantity
            )
              throw new Error(
                'Enter one unique serial number for each purchased unit.',
              );
            for (const serial of serials)
              stockStatements.push(
                saveNew('machines', {
                  operation: true,
                  name: line.description,
                  serialNumber: serial,
                  productId,
                  warehouseId,
                  purchaseId: rid,
                  status: 'Available',
                  cost: String(value / quantity / 100),
                  createdBy: u.name,
                  updatedBy: u.name,
                  updatedAt: today(),
                }),
              );
          }
        }
        if (status === 'Reversed' && m.posting === 'purchase')
          for (const machine of all.filter(
            (r: any) => r.kind === 'machines' && r.purchaseId === rid,
          )) {
            if (machine.status !== 'Available')
              throw new Error(
                'Release linked machines before reversing the purchase.',
              );
            stockStatements.push(
              db
                .prepare(
                  `UPDATE records SET data=json_set(data,'$.status','Inactive'),version=version+1 WHERE id=? AND tenant_id=?`,
                )
                .bind(machine.id, u.tenant_id),
            );
          }
      }
      if (stockJournal.length) {
        journal.lines.push(...stockJournal);
        assertBalanced(journal.lines);
      }
      // A deterministic journal key makes concurrent post/reversal requests atomic and idempotent.
      const journalId = `${rid}-${status === 'Posted' ? 'posting' : 'reversal'}`;
      const guardedJournal = db
        .prepare(
          `INSERT INTO records(id,tenant_id,kind,fy,data,created) SELECT ?,?,'journal',?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND tenant_id=? AND version=?)`,
        )
        .bind(
          journalId,
          u.tenant_id,
          fiscalYear(journal.date),
          JSON.stringify(journal),
          today(),
          rid,
          u.tenant_id,
          existing.version,
        );
      const statements = [
        guardedJournal,
        db
          .prepare(
            'UPDATE records SET data=?,version=version+1 WHERE id=? AND tenant_id=? AND version=?',
          )
          .bind(
            JSON.stringify({
              ...existing,
              status,
              updatedBy: u.name,
              updatedAt: today(),
            }),
            rid,
            u.tenant_id,
            existing.version,
          ),
        event(status, kind, rid, { reason, reference: existing.reference }),
      ];
      // Bump source versions in the same batch so concurrent settlement and reversal cannot race.
      for (const field of ['invoiceId', 'advanceId'])
        if (existing[field]) {
          const source = find(existing[field]);
          if (!source) throw new Error('Settlement source is missing.');
          statements.unshift(
            db
              .prepare(
                'INSERT INTO posting_guards(id,expected,actual) VALUES(?,?,(SELECT version FROM records WHERE id=? AND tenant_id=?))',
              )
              .bind(
                journalId + '-' + field,
                source.version,
                source.id,
                u.tenant_id,
              ),
          );
          if (status === 'Posted')
            statements.unshift(
              db
                .prepare(
                  `INSERT INTO posting_guards(id,expected,actual) VALUES(?,1,CASE WHEN (SELECT COALESCE(SUM(json_extract(data,'$.amount')),0) FROM records WHERE tenant_id=? AND json_extract(data,'$.${field}')=? AND json_extract(data,'$.status')='Posted')+? <= (SELECT json_extract(data,'$.amount') FROM records WHERE tenant_id=? AND id=? AND json_extract(data,'$.status')='Posted') THEN 1 ELSE 0 END)`,
                )
                .bind(
                  journalId + '-' + field + '-balance',
                  u.tenant_id,
                  source.id,
                  existing.amount,
                  u.tenant_id,
                  source.id,
                ),
            );
          statements.push(
            db
              .prepare(
                'UPDATE records SET version=version+1 WHERE id=? AND tenant_id=?',
              )
              .bind(source.id, u.tenant_id),
          );
        }
      const guard = db
        .prepare(
          'INSERT INTO posting_guards(id,expected,actual) VALUES(?,?,(SELECT version FROM records WHERE id=? AND tenant_id=?))',
        )
        .bind(journalId, existing.version, rid, u.tenant_id);
      const result = await db.batch([guard, ...statements, ...stockStatements]);
      if (!result[1].meta.changes)
        return json(
          {
            error: 'Record or invoice balance changed. Reload before posting.',
          },
          409,
        );
      return json({ id: rid });
    }
    if (
      [
        'stock-transfers',
        'stock-adjustments',
        'material-consumption',
        'production-output',
      ].includes(kind) &&
      status === 'Posted'
    ) {
      const q = Number(existing.quantity);
      if (!Number.isSafeInteger(q) || q <= 0)
        throw new Error('Quantity must be a positive whole number.');
      const inward =
        kind === 'production-output' ||
        (kind === 'stock-adjustments' && existing.direction === 'Receipt');
      const balance = await db
        .prepare(
          'SELECT * FROM stock_balances WHERE tenant_id=? AND product_id=? AND warehouse_id=? AND currency=?',
        )
        .bind(
          u.tenant_id,
          existing.productId,
          existing.warehouseId,
          existing.currency,
        )
        .first();
      if (!inward && (!balance || balance.quantity < q))
        throw new Error('Insufficient valued stock in this warehouse.');
      if (
        kind === 'stock-transfers' &&
        existing.toWarehouseId === existing.warehouseId
      )
        throw new Error('Select a different destination warehouse.');
      let value = inward
        ? moneyMinor(existing.unitCost || '0') * q
        : Math.round((balance.value * q) / balance.quantity);
      if (kind === 'production-output') {
        const order = find(existing.sourceId);
        if (!order || !['Confirmed', 'Completed'].includes(order.status))
          throw new Error('Confirm the production order first.');
        const consumed = all
          .filter(
            (r: any) =>
              r.kind === 'material-consumption' &&
              r.sourceId === order.id &&
              r.status === 'Posted' &&
              r.currency === existing.currency,
          )
          .reduce((s: number, r: any) => s + (r.stockValue || 0), 0);
        const outputs = all.filter(
          (r: any) =>
            r.kind === 'production-output' &&
            r.sourceId === order.id &&
            r.status === 'Posted' &&
            r.currency === existing.currency,
        );
        const remaining =
          Number(order.quantity) -
          outputs.reduce((s: number, r: any) => s + Number(r.quantity), 0);
        if (q > remaining || !consumed)
          throw new Error(
            'Output exceeds the remaining plan or no materials have been posted.',
          );
        value = Math.round(
          ((consumed -
            outputs.reduce((s: number, r: any) => s + (r.stockValue || 0), 0)) *
            q) /
            remaining,
        );
      }
      const statements: any[] = [
        db
          .prepare(
            'INSERT INTO posting_guards(id,expected,actual) VALUES(?,?,(SELECT version FROM records WHERE id=? AND tenant_id=?))',
          )
          .bind(rid + '-stock-post', existing.version, rid, u.tenant_id),
      ];
      const addBalance = (warehouse: string) =>
        db
          .prepare(
            'INSERT INTO stock_balances(tenant_id,product_id,warehouse_id,currency,quantity,value) VALUES(?,?,?,?,?,?) ON CONFLICT(tenant_id,product_id,warehouse_id,currency) DO UPDATE SET quantity=quantity+excluded.quantity,value=value+excluded.value,version=version+1',
          )
          .bind(
            u.tenant_id,
            existing.productId,
            warehouse,
            existing.currency,
            q,
            value,
          );
      if (inward) statements.push(addBalance(existing.warehouseId));
      else
        statements.push(
          db
            .prepare(
              'UPDATE stock_balances SET quantity=CASE WHEN version=? THEN quantity-? ELSE -1 END,value=value-?,version=version+1 WHERE tenant_id=? AND product_id=? AND warehouse_id=? AND currency=?',
            )
            .bind(
              balance.version,
              q,
              value,
              u.tenant_id,
              existing.productId,
              existing.warehouseId,
              existing.currency,
            ),
        );
      const movement = {
        date: existing.date,
        reference: existing.reference,
        productId: existing.productId,
        warehouseId: existing.warehouseId,
        quantity: q,
        direction: inward ? 'Receipt' : 'Issue',
        sourceId: rid,
        stockValue: value,
        currency: existing.currency,
        status: 'Posted',
        reason,
        operationStock: true,
      };
      statements.push(saveNew('movements', movement, rid + '-movement'));
      if (kind === 'production-output') {
        const order = find(existing.sourceId);
        statements.push(
          db
            .prepare(
              'INSERT INTO posting_guards(id,expected,actual) VALUES(?,?,(SELECT version FROM records WHERE id=? AND tenant_id=?))',
            )
            .bind(rid + '-production', order.version, order.id, u.tenant_id),
          db
            .prepare(
              'UPDATE records SET version=version+1 WHERE id=? AND tenant_id=?',
            )
            .bind(order.id, u.tenant_id),
        );
      }
      if (kind === 'stock-transfers') {
        statements.push(
          addBalance(existing.toWarehouseId),
          saveNew(
            'movements',
            {
              ...movement,
              warehouseId: existing.toWarehouseId,
              direction: 'Receipt',
            },
            rid + '-destination',
          ),
        );
      } else if (value) {
        const other = kind === 'stock-adjustments' ? '3000' : '1500';
        const lines = inward
          ? [
              { account: '1200', debit: value, credit: 0 },
              { account: other, debit: 0, credit: value },
            ]
          : [
              { account: other, debit: value, credit: 0 },
              { account: '1200', debit: 0, credit: value },
            ];
        assertBalanced(lines);
        statements.push(
          saveNew(
            'journal',
            {
              date: existing.date,
              reference: existing.reference,
              currency: existing.currency,
              status: 'Posted',
              sourceId: rid,
              memo: m.label,
              lines,
            },
            rid + '-posting',
          ),
        );
      }
      statements.push(
        db
          .prepare(
            'UPDATE records SET data=?,version=version+1 WHERE id=? AND tenant_id=?',
          )
          .bind(
            JSON.stringify({
              ...existing,
              status,
              stockValue: value,
              updatedBy: u.name,
              updatedAt: today(),
            }),
            rid,
            u.tenant_id,
          ),
        event('Posted', kind, rid, { reason, quantity: q, value }),
      );
      await db.batch(statements);
      return json({ id: rid });
    }
    return update({ ...existing, status }, 'Status changed', {
      from: current,
      to: status,
      reason,
    });
  }
  if (action === 'convert') {
    const target = opMap[b.target];
    if (
      !m.convert?.includes(b.target) ||
      !target ||
      !permittedOperation(target, u.role, true)
    )
      throw new Error('Conversion is not allowed.');
    if (
      ['Draft', 'Cancelled', 'Reversed', 'Rejected'].includes(existing.status)
    )
      throw new Error('Confirm or accept this record before conversion.');
    const newId = makeId(),
      data = {
        ...existing,
        id: undefined,
        kind: undefined,
        version: undefined,
        created: undefined,
        reference: clean(b.reference, 200),
        sourceId: rid,
        status: initialStatus(target),
        operation: true,
        createdBy: u.name,
        updatedAt: today(),
      };
    if (!data.reference) throw new Error('Enter the new document reference.');
    await db.batch([
      saveNew(target.key, data, newId),
      event('Converted', kind, rid, { target: target.key, id: newId, reason }),
      event('Created', target.key, newId, { sourceId: rid }),
    ]);
    return json({ id: newId, kind: target.key }, 201);
  }
  if (action && action !== 'save') throw new Error('Unknown action.');
  if (existing && m.posting && existing.status !== 'Draft')
    throw new Error(
      'Posted documents cannot be edited. Reverse and create a corrected document.',
    );
  if (
    existing &&
    ['Cancelled', 'Reversed', 'Completed', 'Closed'].includes(existing.status)
  )
    throw new Error('Closed records cannot be edited.');
  const data: any = {
    operation: true,
    status: existing?.status || initialStatus(m),
    createdBy: existing?.createdBy || u.name,
    updatedBy: u.name,
    updatedAt: today(),
  };
  for (const field of m.fields) {
    if (field.type === 'rows') {
      const rows = b[field.key] || [];
      if (!Array.isArray(rows) || rows.length > 50)
        throw new Error(`${field.label} must contain up to 50 rows.`);
      data[field.key] = rows.map((row: any) =>
        Object.fromEntries(
          (field.columns || []).map((c) => {
            const value = clean(row[c.key], 500);
            if (
              c.type === 'email' &&
              value &&
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
            )
              throw new Error('Enter a valid contact email.');
            return [c.key, value];
          }),
        ),
      );
      continue;
    }
    let v = clean(b[field.key], field.type === 'textarea' ? 12000 : 500);
    if (field.required && !v) throw new Error(`${field.label} is required.`);
    if (v && field.type === 'date') validDate(v);
    if (
      v &&
      field.type === 'number' &&
      (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 1e11)
    )
      throw new Error(`${field.label} must be a non-negative number.`);
    if (v && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      throw new Error('Enter a valid email address.');
    if (v && field.options && !field.options.includes(v))
      throw new Error(`Invalid ${field.label}.`);
    if (v && field.source) {
      const linked = find(v);
      if (
        !linked ||
        !(references[field.source] || [field.source]).includes(linked.kind) ||
        ['Inactive', 'Blocked', 'Cancelled', 'Reversed'].includes(linked.status)
      )
        throw new Error(`Select an active ${field.label}.`);
    }
    data[field.key] = v;
  }
  if (data.dueDate && data.dueDate < data.date)
    throw new Error('Due date cannot precede the document date.');
  if (kind === 'approvals') {
    const source = find(data.sourceId);
    if (!source || !opMap[source.kind]?.posting)
      throw new Error('Select a financial document.');
    data.documentVersion = source.version;
  }
  if (kind === 'master-currency' && !/^[A-Z]{3}$/.test(data.code))
    throw new Error('Currency code must be three uppercase letters.');
  if (existing && kind === 'master-currency' && data.code !== existing.code)
    throw new Error('Currency codes cannot be changed after creation.');
  data.currency = data.currencyId
    ? find(data.currencyId)?.code
    : existing?.currency;
  if (m.lines) {
    data.lines = calculateLines(b.lines);
    for (const l of data.lines)
      if (l.productId && find(l.productId)?.kind !== 'products')
        throw new Error('Select a valid product for each line.');
    data.amount = data.lines.reduce((n: number, l: any) => n + l.total, 0);
  } else if (!m.master && data.amount) data.amount = moneyMinor(data.amount);
  if (kind === 'shipping-bills' && data.assessedDate && !data.leoDueDate) {
    const date = new Date(data.assessedDate + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + 15);
    data.leoDueDate = date.toISOString().slice(0, 10);
  }
  if (existing)
    return update(data, 'Edited', {
      reason,
      before: redact(existing),
      after: redact(data),
    });
  const newId = makeId();
  await db.batch([
    saveNew(kind, data, newId),
    event('Created', kind, newId, { reference: data.reference || data.name }),
  ]);
  return json({ id: newId }, 201);
}
