import {
  lifecycle,
  workspaceRows,
  transactionScope,
  inDataView,
  sourceState,
} from '../workflow';
import { quoteStates, salesKinds } from '../sales-engine';
import { financial360 } from '../financial-360';
import {
  inferRelationships,
  exportScope,
  connected,
  pendingFor,
  timelineFor,
  entityLabel,
  entityType,
  relationshipTypes,
  inactive,
} from '../relationships';
import { opMap, permittedOperation } from '../operations';
import { calculationRules, calculate } from '../transaction-rules';
const json = (v: any, s = 200) =>
  Response.json(v, { status: s, headers: { 'Cache-Control': 'no-store' } });
const uid = () => crypto.randomUUID();
const stamp = () => new Date().toISOString();
export async function relationships(
  req: Request,
  path: string,
  b: any,
  u: any,
  db: any,
) {
  const all = (
    await db
      .prepare('SELECT * FROM records WHERE tenant_id=?')
      .bind(u.tenant_id)
      .all()
  ).results.map((r: any) => ({
    ...JSON.parse(r.data),
    id: r.id,
    kind: r.kind,
    fy: r.fy,
    version: r.version,
    created: r.created,
  }));
  const allowed = (r: any) =>
    !['sales-internal', 'sales-draft'].includes(r.kind) &&
    (opMap[r.kind]
      ? permittedOperation(opMap[r.kind], u.role)
      : u.role !== 'Logistics' ||
        [
          'customers',
          'products',
          'warehouses',
          'orders',
          'documents',
          'tasks',
          'exceptions',
        ].includes(r.kind));
  const records = all.filter((r: any) =>
    ['op-document', 'sales-communication'].includes(r.kind)
      ? !!all.find(
          (parent: any) =>
            parent.id === (r.entityId || r.sourceId) && allowed(parent),
        )
      : allowed(r),
  );
  const byId = new Map<string, any>(records.map((r: any) => [r.id, r]));
  const [, action, rid] = path.split('/').map(decodeURIComponent);
  const audit = (action: string, rid: string, detail: any) =>
    db
      .prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?,?)')
      .bind(
        uid(),
        u.tenant_id,
        u.id,
        action,
        rid,
        'relationships',
        JSON.stringify(detail),
        stamp(),
      );
  if (req.method === 'POST') {
    if (!['Admin', 'Finance'].includes(u.role))
      return json(
        { error: 'Relationship changes require Admin or Finance access.' },
        403,
      );
    if (action === 'link') {
      const s = byId.get(b.sourceId),
        t = byId.get(b.targetId);
      if (
        !s ||
        !t ||
        s.id === t.id ||
        !relationshipTypes.includes(b.type) ||
        !String(b.reason || '').trim()
      )
        return json(
          {
            error:
              'Choose two accessible records, a relationship type and supporting reason.',
          },
          400,
        );
      const edge = uid();
      await db.batch([
        db
          .prepare(
            'INSERT INTO entity_relationships(id,tenant_id,source_id,target_id,source_type,target_type,relationship_type,status,origin,confidence,evidence,source_line,target_line,created_by,created,version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)',
          )
          .bind(
            edge,
            u.tenant_id,
            s.id,
            t.id,
            s.kind,
            t.kind,
            b.type,
            'Confirmed',
            'manual',
            1,
            String(b.reason).slice(0, 1000),
            String(b.sourceLine || '').slice(0, 100),
            String(b.targetLine || '').slice(0, 100),
            u.id,
            stamp(),
          ),
        audit('Relationship linked', edge, b),
      ]);
      return json({ id: edge });
    }
    if (action === 'review') {
      const edge = await db
        .prepare(
          'SELECT * FROM entity_relationships WHERE id=? AND tenant_id=?',
        )
        .bind(rid, u.tenant_id)
        .first();
      if (!edge || !byId.has(edge.source_id) || !byId.has(edge.target_id))
        return json({ error: 'Relationship not found.' }, 404);
      if (
        !['Confirmed', 'Rejected'].includes(b.status) ||
        !String(b.reason || '').trim()
      )
        return json({ error: 'A decision and reason are required.' }, 400);
      const result = await db.batch([
        db
          .prepare(
            'UPDATE entity_relationships SET status=?,evidence=?,origin=?,version=version+1 WHERE id=? AND tenant_id=? AND version=?',
          )
          .bind(
            b.status,
            String(b.reason).slice(0, 1000),
            'reviewed',
            rid,
            u.tenant_id,
            b.version,
          ),
        db
          .prepare('INSERT INTO audit SELECT ?,?,?,?,?,?,?,? WHERE changes()=1')
          .bind(
            uid(),
            u.tenant_id,
            u.id,
            'Relationship reviewed',
            rid,
            'relationships',
            JSON.stringify({ before: edge, decision: b }),
            stamp(),
          ),
      ]);
      return result[0].meta.changes
        ? json({ ok: true })
        : json(
            { error: 'Relationship changed. Reload before reviewing.' },
            409,
          );
    }
    if (action === 'task') {
      const r = byId.get(b.recordId);
      if (!r) return json({ error: 'Record not found.' }, 404);
      if (
        !String(b.name || '').trim() ||
        !String(b.owner || '').trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(b.dueDate || '') ||
        !Number.isFinite(Date.parse(b.dueDate))
      )
        return json(
          { error: 'Task, owner and a valid due date are required.' },
          400,
        );
      const existingTask = records.find(
        (t: any) =>
          t.kind === 'tasks' &&
          t.sourceId === r.id &&
          t.name === String(b.name).trim() &&
          !['Completed', 'Cancelled'].includes(t.status),
      );
      if (existingTask)
        return json(
          {
            error:
              'An open task already exists for this action. Open Tasks to update its owner or due date.',
          },
          409,
        );
      const id = uid(),
        date = stamp().slice(0, 10),
        data = {
          operation: true,
          reference: 'TASK-' + id.slice(0, 8),
          name: String(b.name).slice(0, 200),
          owner: String(b.owner).slice(0, 100),
          date,
          dueDate: b.dueDate,
          status: 'Open',
          sourceId: r.id,
        };
      await db.batch([
        db
          .prepare(
            'INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)',
          )
          .bind(id, u.tenant_id, 'tasks', r.fy, JSON.stringify(data), stamp()),
        audit('Task created', id, data),
      ]);
      return json({ id });
    }
    if (action === 'calculate') {
      const r = byId.get(b.recordId);
      if (!r) return json({ error: 'Record not found.' }, 404);
      const result = calculate(b.rule, b.inputs),
        id = uid();
      await db.batch([
        db
          .prepare('INSERT INTO calculation_runs VALUES(?,?,?,?,?,?,?,?)')
          .bind(
            id,
            u.tenant_id,
            r.id,
            b.rule,
            1,
            JSON.stringify({ inputs: b.inputs, result }),
            u.id,
            stamp(),
          ),
        audit('Calculation recorded', r.id, {
          id,
          rule: b.rule,
          version: 1,
          inputs: b.inputs,
          result,
        }),
      ]);
      return json({ id, result });
    }
    return json({ error: 'Unknown action.' }, 404);
  }
  if (req.method !== 'GET') return json({ error: 'Method unavailable.' }, 405);
  if (action === 'dictionary')
    return json({
      entities: Object.values(opMap).map((m) => ({
        entity: m.key,
        label: m.label,
        fields: m.fields.map((f) => ({
          ...f,
          source: f.source || 'ERP entry',
          editable: !m.posting ? 'Until module lock' : 'Before posting',
          validation: f.required
            ? 'Required; server validated'
            : 'Optional; server validated',
          calculation:
            f.type === 'number' ? 'See versioned calculation rules' : null,
        })),
        transitions: salesKinds.includes(m.key)
          ? quoteStates
          : m.posting
            ? {
                Draft: ['Posted', 'Cancelled'],
                Posted: ['Reversed'],
                Reversed: [],
                Cancelled: [],
              }
            : m.transitions,
        documents: m.documents,
      })),
      rules: calculationRules,
    });
  const safe = (r: any) => {
    const base = {
      id: r.id,
      kind: r.kind,
      reference: entityLabel(r),
      name: r.name,
      date: r.date,
      fy: r.fy,
      status: r.status,
      version: r.version,
      created: r.created,
      party:
        r.customerName || r.supplierName || byId.get(r.partnerId)?.name || '',
      serialNumber: r.serialNumber,
    };
    if (u.role === 'Logistics') return base;
    const clean = { ...r };
    for (const k of [
      'sourceFacts',
      'sourceWorkbook',
      'internalCosting',
      'objectKey',
    ])
      delete clean[k];
    if (u.role === 'Viewer')
      for (const k of [
        'pan',
        'gstin',
        'accountNumber',
        'bankAccounts',
        'taxRegistrations',
      ])
        delete clean[k];
    return { ...clean, ...base };
  };
  const stored = (
    await db
      .prepare('SELECT * FROM entity_relationships WHERE tenant_id=?')
      .bind(u.tenant_id)
      .all()
  ).results;
  const storedIds = new Set(stored.map((e: any) => e.id));
  const inferred = inferRelationships(all);
  if (inferred.length) {
    const statements = inferred
      .filter((e) => !storedIds.has(u.tenant_id + '|' + e.id))
      .map((e) =>
        db
          .prepare(
            'INSERT OR IGNORE INTO entity_relationships(id,tenant_id,source_id,target_id,source_type,target_type,relationship_type,status,origin,confidence,evidence,source_line,target_line,created_by,created,version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)',
          )
          .bind(
            u.tenant_id + '|' + e.id,
            u.tenant_id,
            e.source_id,
            e.target_id,
            e.source_type,
            e.target_type,
            e.relationship_type,
            e.status,
            e.origin,
            e.confidence,
            e.evidence,
            e.source_line,
            e.target_line,
            'system',
            stamp(),
          ),
      );
    for (let i = 0; i < statements.length; i += 100)
      await db.batch(statements.slice(i, i + 100));
  }
  const liveKeys = new Set(inferred.map((e) => u.tenant_id + '|' + e.id));
  const edges = (
    await db
      .prepare('SELECT * FROM entity_relationships WHERE tenant_id=?')
      .bind(u.tenant_id)
      .all()
  ).results.filter(
    (e: any) =>
      byId.has(e.source_id) &&
      byId.has(e.target_id) &&
      (e.origin === 'manual' || liveKeys.has(e.id)),
  );
  if (action === 'search') {
    const params = new URL(req.url).searchParams,
      q = (params.get('q') || '').trim().toLowerCase();
    if (!q) return json([]);
    const matches = records
      .filter(
        (r: any) =>
          inDataView(r, params.get('view') || 'All data') &&
          JSON.stringify(safe(r)).toLowerCase().includes(q),
      )
      .slice(0, 40);
    const found = new Map<string, any>();
    for (const r of matches)
      found.set(r.id, { ...safe(r), match: 'Direct match' });
    for (const r of matches)
      for (const n of connected(r.id, records, edges).records)
        if (
          found.size < 120 &&
          !found.has(n.id) &&
          inDataView(n, params.get('view') || 'All data')
        )
          found.set(n.id, { ...safe(n), match: 'Connected record' });
    return json([...found.values()]);
  }
  const permittedFlow = (flow: any) => {
    if (u.role !== 'Logistics') return flow;
    const stages = flow.stages.filter(
      (s: any) =>
        ![
          'realisation',
          'closure',
          'bank',
          'evidence',
          'certificate',
          'incentive',
          'payment',
          'advance',
        ].includes(s.key),
    );
    const next = stages.find((s: any) => s.status !== 'Completed');
    return {
      ...flow,
      stages,
      next: next ? { ...next, action: next.nextAction } : null,
    };
  };
  if (action === 'workspace') {
    const params = new URL(req.url).searchParams;
    const rows = workspaceRows(records, edges).filter(
      (r) =>
        (!params.get('fy') || r.fy === params.get('fy')) &&
        inDataView(r, params.get('view') || 'All data'),
    );
    return json(
      rows.map((r) =>
        u.role === 'Logistics'
          ? {
              ...r,
              ...permittedFlow({ stages: r.stages, next: r.next }),
              amount: undefined,
              currency: undefined,
              totalUsd: undefined,
            }
          : r,
      ),
    );
  }
  if (action === 'control') {
    const exceptions: any[] = [];
    for (const r of records) {
      if (inactive(r)) continue;
      if (r.kind === 'invoices') {
        const scope = exportScope(r.id, records, edges);
        const pending = pendingFor(r, scope.records);
        for (const p of pending.filter((p) => !p.complete))
          exceptions.push({
            id: r.id + '|' + p.key,
            recordId: r.id,
            reference: entityLabel(r),
            kind: r.kind,
            category: p.label,
            action: p.action,
            owner: p.owner,
            date: r.date,
            fy: r.fy,
          });
      }
      if (
        ['payments', 'receipts', 'remittances'].includes(r.kind) &&
        !edges.some(
          (e: any) =>
            e.status === 'Confirmed' &&
            (e.source_id === r.id || e.target_id === r.id) &&
            ['invoices', 'purchase-invoices', 'expenses'].includes(
              byId.get(e.source_id === r.id ? e.target_id : e.source_id)?.kind,
            ),
        )
      )
        exceptions.push({
          id: r.id + '|unallocated',
          recordId: r.id,
          reference: entityLabel(r),
          kind: r.kind,
          category: 'Unallocated payment',
          action: 'Review payment allocation',
          owner: 'Finance',
          date: r.date,
          fy: r.fy,
        });
      if (
        r.kind === 'purchase-invoices' &&
        !edges.some(
          (e: any) =>
            e.status === 'Confirmed' &&
            (e.source_id === r.id || e.target_id === r.id) &&
            byId.get(e.source_id === r.id ? e.target_id : e.source_id)?.kind ===
              'machines',
        )
      )
        exceptions.push({
          id: r.id + '|equipment',
          recordId: r.id,
          reference: entityLabel(r),
          kind: r.kind,
          category: 'Procurement allocation',
          action: 'Review equipment or cost allocation',
          owner: 'Purchase',
          date: r.date,
          fy: r.fy,
        });
    }
    return json({
      exceptions,
      relationships: {
        confirmed: edges.filter((e: any) => e.status === 'Confirmed').length,
        derived: edges.filter((e: any) => e.status === 'Derived').length,
        rejected: edges.filter((e: any) => e.status === 'Rejected').length,
      },
      candidates: edges
        .filter((e: any) => e.status === 'Derived')
        .map((e: any) => ({
          ...e,
          source: entityLabel(byId.get(e.source_id)),
          target: entityLabel(byId.get(e.target_id)),
        })),
      tasks: records
        .filter(
          (r: any) =>
            r.kind === 'tasks' &&
            !['Completed', 'Cancelled'].includes(r.status),
        )
        .map(safe),
    });
  }
  const r = byId.get(action);
  if (!r) return json({ error: 'Record not found or access restricted.' }, 404);
  const scope = connected(r.id, records, edges);
  const ids = scope.records.map((r: any) => r.id);
  const auditRows = (
    await db
      .prepare(
        'SELECT a.*,u.name actor FROM audit a LEFT JOIN users u ON a.user_id=u.id WHERE a.tenant_id=? ORDER BY a.created DESC',
      )
      .bind(u.tenant_id)
      .all()
  ).results.filter((e: any) => ids.includes(e.record_id));
  const versions = (
    await db
      .prepare(
        'SELECT id,record_id,version,data,created FROM record_versions WHERE tenant_id=? AND record_id=? ORDER BY version DESC',
      )
      .bind(u.tenant_id, r.id)
      .all()
  ).results;
  const runs = (
    await db
      .prepare(
        'SELECT * FROM calculation_runs WHERE tenant_id=? AND record_id=? ORDER BY created DESC',
      )
      .bind(u.tenant_id, r.id)
      .all()
  ).results;
  const exportChecks = scope.records
    .filter((n: any) => n.kind === 'invoices' && !inactive(n))
    .map((invoice: any) =>
      pendingFor(invoice, exportScope(invoice.id, records, edges).records),
    );
  const workflow = exportChecks.length
    ? [
        ...new Map(exportChecks.flat().map((p: any) => [p.key, p])).values(),
      ].map((p: any) => ({
        ...p,
        complete: exportChecks.every((checks) => {
          const check = checks.find((c) => c.key === p.key);
          return !check || check.complete;
        }),
      }))
    : [];
  if (r.calculation)
    runs.unshift({
      id: r.id + '-calculation',
      rule_id: r.calculation.rule,
      rule_version: r.calculation.version,
      data: JSON.stringify(r.calculation),
      created: r.created,
    });
  return json({
    financial:
      u.role === 'Logistics'
        ? { lines: [], summary: [] }
        : financial360(
            scope.records,
            r.fy === 'master'
              ? String(
                  new Date().getMonth() >= 3
                    ? new Date().getFullYear()
                    : new Date().getFullYear() - 1,
                ) +
                  '–' +
                  String(
                    new Date().getMonth() >= 3
                      ? new Date().getFullYear() + 1
                      : new Date().getFullYear(),
                  ).slice(-2)
              : r.fy,
          ),
    record: { ...safe(r), dataState: sourceState(r) },
    lifecycle: permittedFlow(lifecycle(r, transactionScope(r, records, edges))),
    transactions: workspaceRows(scope.records, edges).map((t) =>
      u.role === 'Logistics'
        ? { ...t, amount: undefined, currency: undefined, totalUsd: undefined }
        : t,
    ),
    records: scope.records.map(safe),
    edges: scope.edges,
    candidates: scope.candidates.map((e: any) => ({
      ...e,
      source: entityLabel(byId.get(e.source_id)),
      target: entityLabel(byId.get(e.target_id)),
    })),
    timeline: timelineFor(scope.records),
    pending: workflow,
    audit: ['Admin', 'Finance'].includes(u.role) ? auditRows : [],
    versions: ['Admin', 'Finance'].includes(u.role) ? versions : [],
    calculations: ['Admin', 'Finance'].includes(u.role) ? runs : [],
    rules: calculationRules,
    sourceAvailable:
      !!r.sourceWorkbook && ['Admin', 'Finance'].includes(u.role),
    canManage: ['Admin', 'Finance'].includes(u.role),
    types: relationshipTypes,
  });
}
