'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api, money, Loading, Status } from './erp-ui';
import { LifecycleRail, FinanceOverview } from './process-workspace';
import { mainRecordSections } from '@/lib/workspace-navigation';
import { sourceState } from '@/lib/workflow';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { RecordSummary } from './record-summary';
import { WorkbookRecord } from './workbook-data';
import { entityLabel, entityType } from '@/lib/relationships';
const label = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (x) => x.toUpperCase());
const tabs = [
  'Overview',
  'Items',
  'Reconciliation',
  'Transactions',
  'Finance',
  'Logistics',
  'Procurement',
  'Documents',
  'Communication',
  'Tasks',
  'Timeline',
  '360°',
  'Audit',
  'Source & Migration',
];
const reference = (r: any) => entityLabel(r);
export function RelatedRecords({
  records,
  go,
}: {
  records: any[];
  go: (r: string) => void;
}) {
  const [q, setQ] = useState(''),
    [page, setPage] = useState(0);
  const rows = records.filter((r) =>
    (entityLabel(r) + ' ' + entityType(r.kind) + ' ' + (r.serialNumber || ''))
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  useEffect(() => setPage(0), [q, records.length]);
  return (
    <div className="related-register">
      {records.length > 8 && (
        <Input
          aria-label="Find related record"
          placeholder="Find related record…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}{' '}
      {rows.slice(page * 15, page * 15 + 15).map((r) => (
        <button
          className="related-line"
          key={r.id}
          onClick={() => go('transactions?record=' + encodeURIComponent(r.id))}
        >
          <span>{entityType(r.kind)}</span>
          <strong>{reference(r)}</strong>
          <span>{r.date || r.serialNumber || ''}</span>
        </button>
      ))}
      {!rows.length && <p className="muted">No matching linked records.</p>}
      {rows.length > 15 && (
        <div className="simple-panel-foot">
          <span>{rows.length} records</span>
          <Button
            variant="ghost"
            disabled={!page}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            disabled={(page + 1) * 15 >= rows.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
export function Record360({
  id,
  go,
  back,
  onManage,
}: {
  id: string;
  go: (r: string) => void;
  back?: () => void;
  onManage?: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [tab, setTab] = useState('Overview'),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [task, setTask] = useState<any>({}),
    [link, setLink] = useState<any>({ type: 'REFERENCES' }),
    [query, setQuery] = useState(''),
    [matches, setMatches] = useState<any[]>([]),
    [rule, setRule] = useState('fx'),
    [inputs, setInputs] = useState<any>({}),
    [result, setResult] = useState<any>(null),
    [file, setFile] = useState<File | null>(null),
    [category, setCategory] = useState('Supporting document');
  useEffect(() => {
    let live = true;
    setError('');
    setData(null);
    api('relationships/' + encodeURIComponent(id))
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [id, revision]);
  useEffect(() => {
    const requested =
      new URLSearchParams(window.location.search).get('section') || 'Overview';
    setTab(tabs.includes(requested) ? requested : 'Overview');
    setTask({});
    setLink({ type: 'REFERENCES' });
    setInputs({});
    setResult(null);
  }, [id]);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      api('relationships/search?q=' + encodeURIComponent(query))
        .then((r) => live && setMatches(r))
        .catch((e) => live && setError(e.message));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);
  async function mutate(path: string, body: any) {
    setBusy(true);
    setError('');
    try {
      const r = await api('relationships/' + path, body);
      setRevision((n) => n + 1);
      return r;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <>
        {error ? (
          <p className="error-box">
            {error}
            <Button onClick={() => setRevision((n) => n + 1)}>Retry</Button>
          </p>
        ) : (
          <Loading />
        )}
      </>
    );
  const r = data.record,
    nodes = data.records.filter((x: any) => x.id !== id),
    get = (rid: string) => data.records.find((x: any) => x.id === rid),
    pending = data.pending.filter((p: any) => !p.complete),
    definition = data.rules.find((d: any) => d.id === rule);
  const subset = (kinds: string[]) =>
    nodes.filter((r: any) => kinds.includes(r.kind));
  const finance = subset([
    'invoices',
    'domestic-invoices',
    'purchase-invoices',
    'expenses',
    'receipts',
    'payments',
    'remittances',
    'forex',
    'ebrc',
    'incentives',
    'customer-advances',
    'supplier-advances',
    'journal',
  ]);
  const financialTotals = Object.entries(
    finance.reduce((tot: any, n: any) => {
      if (n.amount !== undefined) {
        const k = entityType(n.kind) + ' · ' + (n.currency || 'INR');
        tot[k] = (tot[k] || 0) + Number(n.amount);
      }
      return tot;
    }, {}),
  );
  const business = Object.entries(r).filter(
    ([k, v]) =>
      ![
        'id',
        'kind',
        'created',
        'version',
        'operation',
        'importLocked',
        'sourceAmountExact',
        'sourceRow',
        'sourceId',
        'partnerId',
        'relatedIds',
        'lines',
        'totals',
        'sourceFacts',
        'sourceWorkbook',
      ].includes(k) &&
      !k.endsWith('Id') &&
      v !== '' &&
      v !== null &&
      v !== undefined &&
      typeof v !== 'object',
  );
  const next = data.lifecycle ? data.lifecycle.next : pending[0];
  const assignStage = (stage: any) => {
    setTab('Tasks');
    setTask({
      name: stage.action || stage.nextAction,
      owner: stage.owner,
      dueDate: stage.dueDate || '',
    });
  };
  return (
    <div className="r360 record-workspace">
      <header className="widget r360-header">
        <div className="r360-top">
          <Button variant="outline" onClick={back || (() => go(r.kind))}>
            ← Back
          </Button>
          <span>{entityType(r.kind)}</span>
          <div className="inline-actions">
            {data.canManage && onManage && (
              <Button variant="outline" onClick={onManage}>
                Edit / actions
              </Button>
            )}
            {data.canManage && !onManage && !r.importLocked && (
              <Button
                variant="outline"
                onClick={() =>
                  go(
                    r.kind + '?record=' + encodeURIComponent(id) + '&actions=1',
                  )
                }
              >
                Edit / actions
              </Button>
            )}
            <Button variant="outline" onClick={() => setTab('Documents')}>
              Create document
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                More
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {[
                  ['Tasks', 'Tasks'],
                  ['Communication', 'Communication'],
                  ['360°', 'Connections'],
                  ['Audit', 'Audit'],
                  ['Source & Migration', 'Source & migration'],
                  ['Procurement', 'Procurement'],
                  ['Logistics', 'Logistics'],
                ]
                  .filter(
                    ([key]) =>
                      key !== 'Source & Migration' || data.sourceAvailable,
                  )
                  .map(([key, title]) => (
                    <DropdownMenuItem key={key} onClick={() => setTab(key)}>
                      {title}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => window.print()}>
              Print view
            </Button>
          </div>
        </div>
        <h2>{reference(r)}</h2>
        <p>{r.party || r.name || r.serialNumber || ''}</p>
        <div className="r360-top">
          <Status value={data.lifecycle?.status || r.status || 'Recorded'} />
          <span>{r.date || 'Date not supplied'}</span>
          <span className="record-source-state">{sourceState(r)}</span>
          {r.totalUsd && (
            <strong>
              {money(Math.round(Number(r.totalUsd) * 100), 'USD')}
            </strong>
          )}
          {r.amount !== undefined && (
            <span>{money(r.amount, r.currency || 'INR')}</span>
          )}
          <Button variant="outline" onClick={() => setTab('Documents')}>
            Documents
          </Button>
          <Button variant="ghost" onClick={() => setTab('Timeline')}>
            Activity
          </Button>
        </div>
      </header>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      {next && (
        <section className="record-next-action">
          <div>
            <span>Next action</span>
            <strong>{next.action}</strong>
            <small>
              Owner: {next.owner} · Due: {next.dueDate || 'Not assigned'}
            </small>
          </div>
          {data.canManage && (
            <Button onClick={() => assignStage(next)}>Assign task</Button>
          )}
        </section>
      )}
      <LifecycleRail
        flow={data.lifecycle}
        records={data.records}
        go={go}
        onAssign={assignStage}
        canAssign={data.canManage}
      />
      <nav className="r360-tabs" aria-label="Record information">
        {mainRecordSections.map(([key, title]) => (
          <button
            key={key}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}
          >
            {title}
          </button>
        ))}
      </nav>
      {tab === 'Items' && (
        <RecordSummary data={data} go={go} section={setTab} items />
      )}
      {tab === 'Finance' && (
        <FinanceOverview
          data={data}
          go={go}
          onDetails={() => setTab('Reconciliation')}
        />
      )}
      {tab === 'Overview' && (
        <RecordSummary data={data} go={go} section={setTab} />
      )}
      {tab === 'Transactions' && (
        <section className="widget">
          <h3>All confirmed related transactions</h3>
          <RelatedRecords records={nodes} go={go} />
        </section>
      )}
      {tab === 'Procurement' && (
        <section className="widget">
          <h3>Underlying procurement and equipment</h3>
          <RelatedRecords
            records={subset([
              'vendors',
              'purchase-orders',
              'purchase-invoices',
              'purchase-debit-notes',
              'machines',
              'products',
              'warehouses',
            ])}
            go={go}
          />
          <p className="muted">
            Procurement supports the export through equipment and cost
            allocation. It does not itself establish bank realisation.
          </p>
        </section>
      )}
      {tab === 'Logistics' && (
        <section className="widget">
          <h3>Export and shipment documents</h3>
          <RelatedRecords
            records={subset([
              'shipping-bills',
              'bills-of-lading',
              'shipments',
              'export-shipments',
              'packing-lists',
              'export-documents',
              'delivery-challans',
              'eway-bills',
            ])}
            go={go}
          />
        </section>
      )}
      {tab === 'Reconciliation' && (
        <section className="widget">
          <h3>Financial reconciliation</h3>
          <p>{data.financial.note}</p>
          <div className="r360-scroll">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Settled</th>
                  <th>Balance</th>
                  <th>Accounting status</th>
                </tr>
              </thead>
              <tbody>
                {data.financial.lines.map((l: any) => (
                  <tr key={l.id}>
                    <td>
                      <button onClick={() => go('record360?record=' + l.id)}>
                        {l.reference}
                      </button>
                    </td>
                    <td>{l.type}</td>
                    <td>{money(l.amount, l.currency)}</td>
                    <td>{money(l.settled, l.currency)}</td>
                    <td>{money(l.balance, l.currency)}</td>
                    <td>{l.posting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Totals below group recorded amounts by type and currency. Historical
            imports are separate from posted ledger balances.
          </p>
          <div className="r360-kpis">
            {financialTotals.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{money(Number(v), k.split(' · ').at(-1))}</strong>
              </div>
            ))}
          </div>
          <RelatedRecords records={finance} go={go} />
          <details>
            <summary>Calculation rules & history</summary>
            <h3>Calculation rules</h3>
            <select
              value={rule}
              onChange={(e) => {
                setRule(e.target.value);
                setInputs({});
                setResult(null);
              }}
            >
              {data.rules.map((d: any) => (
                <option value={d.id} key={d.id}>
                  {d.label} · v{d.version}
                </option>
              ))}
            </select>
            <p>{definition.description}</p>
            {data.canManage && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const answer = await mutate('calculate', {
                    recordId: id,
                    rule,
                    inputs,
                  });
                  if (answer) setResult(answer.result);
                }}
              >
                <div className="r360-fields">
                  {definition.inputs.map((k: string) => (
                    <label key={k}>
                      {label(k)}
                      {k === 'interstate' ? (
                        <select
                          value={String(inputs[k] ?? '')}
                          onChange={(e) =>
                            setInputs({
                              ...inputs,
                              [k]: e.target.value === 'true',
                            })
                          }
                          required
                        >
                          <option value="">Choose</option>
                          <option value="true">Interstate</option>
                          <option value="false">Intrastate</option>
                        </select>
                      ) : (
                        <Input
                          type="number"
                          step="any"
                          required
                          value={inputs[k] ?? ''}
                          onChange={(e) =>
                            setInputs({ ...inputs, [k]: e.target.value })
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
                <Button disabled={busy}>Calculate and save audit</Button>
              </form>
            )}
            {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
            <h3>Saved calculations</h3>
            {data.calculations.map((c: any) => (
              <details key={c.id}>
                <summary>
                  {c.rule_id} v{c.rule_version} · {c.created}
                </summary>
                <pre>{JSON.stringify(JSON.parse(c.data), null, 2)}</pre>
              </details>
            ))}
          </details>
        </section>
      )}
      {tab === 'Documents' && (
        <section className="widget">
          <details>
            <summary>Export document checklist</summary>
            <div className="r360-records">
              {[
                'invoices',
                'packing-lists',
                'shipping-bills',
                'bills-of-lading',
                'export-documents',
                'receipts',
                'ebrc',
              ].map((kind) => {
                const docs = data.records.filter((n: any) => n.kind === kind);
                return (
                  <div key={kind}>
                    <strong>{entityType(kind)}</strong>
                    <span>{docs.length ? 'Recorded' : 'No linked record'}</span>
                    <RelatedRecords records={docs} go={go} />
                  </div>
                );
              })}
            </div>
          </details>
          <h3>Attachments</h3>
          <RelatedRecords records={subset(['documents'])} go={go} />
          {subset(['op-document']).map((d: any) => (
            <p key={d.id}>
              <a href={'/api/v1/operations/documents/' + d.id}>
                {d.filename || d.reference} ↓
              </a>{' '}
              · {d.category} · Version {d.documentVersion || d.version}
            </p>
          ))}
          {data.canManage && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!file) return;
                setBusy(true);
                setError('');
                try {
                  if (file.size > 5 * 1024 * 1024)
                    throw new Error('Maximum file size is 5 MB.');
                  const content = await new Promise<string>(
                    (resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () =>
                        resolve(String(reader.result).split(',')[1]);
                      reader.onerror = () =>
                        reject(new Error('Unable to read file.'));
                      reader.readAsDataURL(file);
                    },
                  );
                  await api('operations/' + r.kind + '/' + r.id + '/document', {
                    category,
                    filename: file.name,
                    mime: file.type,
                    content,
                    status: 'Final',
                    version: r.version,
                  });
                  setFile(null);
                  setRevision((n) => n + 1);
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h3>Add supporting document</h3>
              <label>
                Document category
                <Input
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </label>
              <Input
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,.xlsx"
              />
              <Button disabled={busy || !file}>Upload document</Button>
            </form>
          )}
          <p>
            Certificate of origin, insurance and inspection requirements must be
            checked for the shipment.
          </p>
        </section>
      )}
      {tab === 'Communication' && (
        <section className="widget">
          <h3>Recorded communication</h3>
          {subset(['sales-communication']).map((c: any) => (
            <article key={c.id}>
              <strong>
                {c.date || c.created} · {c.channel || c.type || 'Note'}
              </strong>
              <p>{c.notes || c.note || c.reason || c.message || c.reference}</p>
            </article>
          ))}
          {!subset(['sales-communication']).length && (
            <p>No linked communication recorded.</p>
          )}
          <p>
            Use the existing sales record actions to record communication.
            Messages are not sent automatically.
          </p>
        </section>
      )}
      {tab === 'Tasks' && (
        <section className="widget">
          <h3>Pending work</h3>
          {pending.map((p: any) => (
            <p key={p.key}>
              ○ {p.action} · {p.owner}
            </p>
          ))}
          <RelatedRecords
            records={subset(['tasks', 'checklists', 'approvals'])}
            go={go}
          />
          {data.canManage && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await mutate('task', { ...task, recordId: id });
              }}
            >
              <h3>Assign next action</h3>
              <div className="r360-fields">
                <label>
                  Task
                  <Input
                    required
                    value={task.name || ''}
                    onChange={(e) => setTask({ ...task, name: e.target.value })}
                  />
                </label>
                <label>
                  Owner
                  <Input
                    required
                    value={task.owner || ''}
                    onChange={(e) =>
                      setTask({ ...task, owner: e.target.value })
                    }
                  />
                </label>
                <label>
                  Due date
                  <Input
                    type="date"
                    required
                    value={task.dueDate || ''}
                    onChange={(e) =>
                      setTask({ ...task, dueDate: e.target.value })
                    }
                  />
                </label>
              </div>
              <Button disabled={busy}>Create linked task</Button>
            </form>
          )}
        </section>
      )}
      {tab === 'Timeline' && (
        <section className="widget">
          <h3>Business timeline</h3>
          <ol className="r360-timeline">
            {data.timeline.map((e: any, i: number) => (
              <li key={i}>
                <time>{e.date}</time>
                <button onClick={() => go('record360?record=' + e.recordId)}>
                  <strong>{e.label}</strong>
                  <span>
                    {e.reference} · {e.evidence}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {!data.timeline.length && <p>No dated events supplied.</p>}
        </section>
      )}
      {tab === '360°' && (
        <section className="widget">
          <h3>Transaction graph</h3>
          <p>
            Each connection shows its direction, relationship and supporting
            evidence.
          </p>
          <div className="r360-edges">
            {data.edges.map((e: any) => (
              <div key={e.id}>
                <button onClick={() => go('record360?record=' + e.source_id)}>
                  {reference(get(e.source_id) || { id: e.source_id })}
                </button>
                <span>
                  → {e.relationship_type.replaceAll('_', ' ')} →
                  <small>
                    {e.evidence}
                    {e.source_line ? ' · Line ' + e.source_line : ''} ·{' '}
                    {e.status}
                  </small>
                </span>
                <button onClick={() => go('record360?record=' + e.target_id)}>
                  {reference(get(e.target_id) || { id: e.target_id })}
                </button>
              </div>
            ))}
          </div>
          <h3>Potential matches — review required</h3>
          {data.candidates.map((e: any) => (
            <div className="r360-review" key={e.id}>
              <p>
                {e.source} → {e.target}
              </p>
              <small>
                {e.evidence} · Confidence {Math.round(e.confidence * 100)}%
              </small>
              {data.canManage && (
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    await mutate('review/' + encodeURIComponent(e.id), {
                      status: form.get('status'),
                      reason: form.get('reason'),
                      version: e.version,
                    });
                  }}
                >
                  <Input
                    name="reason"
                    placeholder="Evidence and review reason"
                    required
                  />
                  <select name="status">
                    <option>Confirmed</option>
                    <option>Rejected</option>
                  </select>
                  <Button disabled={busy}>Save review</Button>
                </form>
              )}
            </div>
          ))}
          {data.canManage && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await mutate('link', { ...link, sourceId: id });
              }}
            >
              <h3>Link a record</h3>
              <Input
                placeholder="Search name, invoice, serial or bank reference"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                required
                value={link.targetId || ''}
                onChange={(e) => setLink({ ...link, targetId: e.target.value })}
              >
                <option value="">Choose a record</option>
                {matches
                  .filter((m) => m.id !== id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {entityType(m.kind)} · {reference(m)}
                    </option>
                  ))}
              </select>
              <select
                value={link.type}
                onChange={(e) => setLink({ ...link, type: e.target.value })}
              >
                {data.types.map((t: string) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <div className="r360-fields">
                <label>
                  Source line (optional)
                  <Input
                    value={link.sourceLine || ''}
                    onChange={(e) =>
                      setLink({ ...link, sourceLine: e.target.value })
                    }
                  />
                </label>
                <label>
                  Target line (optional)
                  <Input
                    value={link.targetLine || ''}
                    onChange={(e) =>
                      setLink({ ...link, targetLine: e.target.value })
                    }
                  />
                </label>
              </div>
              <Input
                required
                placeholder="Supporting evidence / reason"
                value={link.reason || ''}
                onChange={(e) => setLink({ ...link, reason: e.target.value })}
              />
              <Button disabled={busy}>Save relationship</Button>
            </form>
          )}
        </section>
      )}
      {tab === 'Audit' && (
        <section className="widget">
          <h3>Audit and versions</h3>
          {data.audit.map((a: any) => (
            <details key={a.id}>
              <summary>
                {a.created} · {a.action} · {a.actor || 'System'}
              </summary>
              <pre>{a.detail}</pre>
            </details>
          ))}
          {data.versions.map((v: any) => (
            <details key={v.id}>
              <summary>
                Preserved version {v.version} · {v.created}
              </summary>
              <pre>{JSON.stringify(JSON.parse(v.data), null, 2)}</pre>
            </details>
          ))}
          {!data.audit.length && !data.versions.length && (
            <p>No accessible audit events or prior versions.</p>
          )}
        </section>
      )}
      {tab === 'Source & Migration' && (
        <WorkbookRecord record={r} back={() => setTab('Overview')} go={go} />
      )}
    </div>
  );
}
export function ControlTower({
  go,
  fy,
  compact = false,
}: {
  go: (r: string) => void;
  fy: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [category, setCategory] = useState('All'),
    [q, setQ] = useState(''),
    [page, setPage] = useState(0);
  useEffect(() => {
    let live = true;
    api('relationships/control')
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  if (error) return <p className="error-box">{error}</p>;
  if (!data) return <Loading />;
  const scope = data.exceptions.filter((e: any) => e.fy === fy),
    groups = [...new Set<string>(scope.map((e: any) => e.category))],
    rows = scope.filter(
      (e: any) =>
        (category === 'All' || e.category === category) &&
        JSON.stringify(e).toLowerCase().includes(q.toLowerCase()),
    );
  return (
    <section className="widget r360-control">
      <div className="r360-top">
        <h2>
          {compact
            ? "Today's control tower"
            : 'Exception & Reconciliation Centre'}
        </h2>
        {compact && (
          <Button variant="outline" onClick={() => go('control-tower')}>
            View all actions
          </Button>
        )}
      </div>
      <div className="r360-kpis">
        {groups.slice(0, compact ? 4 : groups.length).map((g) => (
          <button
            key={g}
            onClick={() => {
              setCategory(g);
              setPage(0);
            }}
          >
            <span>{g}</span>
            <strong>{scope.filter((e: any) => e.category === g).length}</strong>
          </button>
        ))}
      </div>
      <p>
        Missing evidence indicates a review action; it does not prove that the
        business step did not happen.
      </p>
      {!compact && (
        <>
          <div className="r360-top">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(0);
              }}
            >
              <option>All</option>
              {groups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <Input
              placeholder="Search actions"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
            <Button variant="outline" onClick={() => go('workbook-data')}>
              Migration & source reconciliation
            </Button>
            <Button variant="outline" onClick={() => go('data-dictionary')}>
              Data dictionary & rules
            </Button>
          </div>
          <p>
            Relationships: {data.relationships.confirmed} confirmed ·{' '}
            {data.relationships.derived} awaiting review ·{' '}
            {data.relationships.rejected} rejected
          </p>
        </>
      )}
      <div className="r360-scroll">
        <table>
          <thead>
            <tr>
              <th>Record</th>
              <th>Missing / pending</th>
              <th>Next action</th>
              <th>Suggested team</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice(compact ? 0 : page * 25, compact ? 5 : page * 25 + 25)
              .map((e: any) => (
                <tr key={e.id}>
                  <td>
                    <button
                      onClick={() => go('record360?record=' + e.recordId)}
                    >
                      {e.reference} ↗
                    </button>
                  </td>
                  <td>{e.category}</td>
                  <td>{e.action}</td>
                  <td>{e.owner}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>No matching exceptions in FY {fy}.</p>}
      {!compact && (
        <div className="r360-top">
          <Button disabled={!page} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span>
            {rows.length} actions · page {page + 1}
          </span>
          <Button
            disabled={(page + 1) * 25 >= rows.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
}
export function DataDictionary() {
  const [data, setData] = useState<any>(null),
    [q, setQ] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    api('relationships/dictionary')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="widget r360">
      <h2>Data dictionary, workflow & calculation rules</h2>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find an entity or field"
      />
      {error && <p className="error-box">{error}</p>}
      {data?.entities
        .filter((e: any) =>
          JSON.stringify(e).toLowerCase().includes(q.toLowerCase()),
        )
        .map((e: any) => (
          <details key={e.entity}>
            <summary>
              {e.label} · {e.fields.length} fields
            </summary>
            <div className="r360-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      'Field',
                      'Type',
                      'Required',
                      'Source / relationship',
                      'Editable',
                      'Validation',
                    ].map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {e.fields.map((f: any) => (
                    <tr key={f.key}>
                      <td>
                        {f.label} ({f.key})
                      </td>
                      <td>{f.type || 'text'}</td>
                      <td>{f.required ? 'Yes' : 'No'}</td>
                      <td>{f.source}</td>
                      <td>{f.editable}</td>
                      <td>{f.validation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h4>Allowed workflow transitions</h4>
            {Object.entries(e.transitions).map(([s, v]: any) => (
              <p key={s}>
                {s} → {v.join(', ') || 'Terminal state'}
              </p>
            ))}
            <p>
              Documents: {e.documents.join(', ') || 'Supporting attachments'}
            </p>
          </details>
        ))}
      {data?.rules.map((r: any) => (
        <details key={r.id}>
          <summary>
            {r.label} v{r.version}
          </summary>
          <p>{r.description}</p>
          <p>Inputs: {r.inputs.join(', ')}</p>
        </details>
      ))}
    </section>
  );
}
