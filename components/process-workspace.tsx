'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Search, ChevronRight, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api, Loading, Blank, money, exportCSV, Status } from './erp-ui';
import { useDataView } from './data-view';
import { opMap } from '@/lib/operations';
import { processModules, canOpenWorkspace } from '@/lib/workspace-navigation';
import { entityLabel } from '@/lib/relationships';
import { sourceState, processState, Stage } from '@/lib/workflow';
import { financial360 } from '@/lib/financial-360';
export const transactionLink = (id: string, section = 'Overview') =>
  'transactions?record=' +
  encodeURIComponent(id) +
  '&section=' +
  encodeURIComponent(section);
export function ProcessHub({
  route,
  go,
  role,
}: {
  route: string;
  go: any;
  role: string;
}) {
  const m = processModules[route];
  return (
    <div className="process-hub">
      <nav aria-label={m.label + ' pages'}>
        {m.pages
          .filter(([r]) => canOpenWorkspace(r, role))
          .map(([r, l]) => (
            <button key={r} onClick={() => go(r)}>
              <span>{l}</span>
              <ArrowUpRight size={17} />
            </button>
          ))}
      </nav>
      {route === 'sales' && (
        <p>
          Open Transactions to follow a sale from quotation through shipment,
          realisation and closure.
        </p>
      )}
    </div>
  );
}
export function useWorkspaces(fy: string) {
  const { view } = useDataView();
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, retry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    api(
      'relationships/workspace?fy=' +
        encodeURIComponent(fy) +
        '&view=' +
        encodeURIComponent(view),
    )
      .then((r) => live && setRows(r))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [fy, view, revision]);
  return { rows, error, loading, retry: () => retry((v) => v + 1) };
}
export function WorkDashboard({
  fy,
  go,
  records,
  mode = 'dashboard',
}: {
  fy: string;
  go: any;
  records: any[];
  mode?: string;
}) {
  const { rows, error, loading, retry } = useWorkspaces(fy),
    { view, setView, includes } = useDataView();
  const [q, setQ] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [show, setShow] = useState(false),
    [date, setDate] = useState(''),
    [page, setPage] = useState(0);
  useEffect(() => setPage(0), [q, date, view]);
  const tasks = records.filter(
    (r) =>
      r.kind === 'tasks' &&
      includes(r) &&
      !['Completed', 'Cancelled'].includes(r.status),
  );
  const today = new Date().toISOString().slice(0, 10);
  const pending = rows.filter(
    (r) => r.next && !['Cancelled', 'Rejected', 'Closed'].includes(r.status),
  );
  const work = pending.map((r) => ({
    ...r,
    task: tasks.find((t) => t.sourceId === r.id && t.name === r.next.action),
  }));
  const due = work.filter(
      (r) => (r.task?.dueDate || r.next.dueDate) === today,
    ).length,
    overdue = work.filter(
      (r) =>
        (r.task?.dueDate || r.next.dueDate) &&
        (r.task?.dueDate || r.next.dueDate) < today,
    ).length;
  const filtered = (mode === 'transactions' ? rows : work).filter(
    (r) =>
      JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) &&
      (!date || (r.task?.dueDate || r.next?.dueDate) === date),
  );
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="error-box">
        {error}
        <Button onClick={retry}>Retry</Button>
      </div>
    );
  return (
    <div className="work-dashboard">
      {mode !== 'transactions' && (
        <>
          <div className="work-intro">
            <div>
              <span>Today · {today}</span>
              <h2>{pending.length} transactions need attention</h2>
            </div>
            <div>
              <span>
                <strong>{overdue}</strong> overdue
              </span>
              <span>
                <strong>{due}</strong> due today
              </span>
              <span>
                <strong>{tasks.length}</strong> assigned tasks
              </span>
            </div>
          </div>
          <section className="work-priorities">
            <h3>My work</h3>
            {[...new Set(work.map((r) => r.next.action))]
              .slice(0, 5)
              .map((action) => (
                <button key={action} onClick={() => setQ(action)}>
                  <span>{action}</span>
                  <strong>
                    {work.filter((r) => r.next.action === action).length}
                  </strong>
                  <ChevronRight size={16} />
                </button>
              ))}
            {!work.length && <p>No lifecycle gaps in this data view.</p>}
            <Button variant="ghost" onClick={() => go('tasks')}>
              Open assigned tasks
            </Button>
          </section>
        </>
      )}
      <section className="work-register">
        <header>
          <h3>
            {mode === 'transactions'
              ? 'Transactions'
              : mode === 'work-calendar'
                ? 'Work calendar'
                : 'Active transactions'}
          </h3>
          <div>
            <Input
              aria-label="Search transactions"
              placeholder="Find transaction, customer or next action…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {mode === 'work-calendar' && (
              <Input
                type="date"
                aria-label="Due date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
            <Button variant="outline" onClick={() => setShow(!show)}>
              Columns
            </Button>
            <Button
              variant="outline"
              disabled={!selected.length}
              onClick={() =>
                exportCSV(
                  filtered
                    .filter((r) => selected.includes(r.id))
                    .map((r) => ({
                      reference: r.reference,
                      customer: r.party,
                      status: r.status,
                      stage: r.stage,
                      nextAction: r.next?.action || '',
                      currency: r.currency,
                      amount: r.amount === undefined ? '' : r.amount / 100,
                    })),
                  'Selected transactions',
                )
              }
            >
              Export selected ({selected.length})
            </Button>
          </div>
        </header>
        {show && (
          <p className="work-column-note">
            Reference, customer, status and next action are always shown.{' '}
            <label>
              <input
                type="checkbox"
                checked={show}
                onChange={() => setShow(false)}
              />{' '}
              Show date, source and amount
            </label>
          </p>
        )}
        <div className="simple-table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select visible transactions"
                    checked={
                      !!filtered.length &&
                      filtered
                        .slice(page * 30, page * 30 + 30)
                        .every((r) => selected.includes(r.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? filtered
                              .slice(page * 30, page * 30 + 30)
                              .map((r) => r.id)
                          : [],
                      )
                    }
                  />
                </th>
                <th>Transaction</th>
                <th>Customer / supplier</th>
                <th>Current stage</th>
                <th>Next action</th>
                {show && (
                  <>
                    <th>Date</th>
                    <th>Data source</th>
                    <th>Amount</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * 30, page * 30 + 30).map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      aria-label={'Select ' + r.reference}
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, r.id]
                            : selected.filter((i) => i !== r.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => go(transactionLink(r.id))}
                    >
                      {r.reference}
                    </button>
                  </td>
                  <td>{r.party || '—'}</td>
                  <td>{r.stage}</td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => go(transactionLink(r.id, 'Tasks'))}
                    >
                      {r.next?.action || 'Review closure'}
                    </button>
                  </td>
                  {show && (
                    <>
                      <td>{r.date}</td>
                      <td>{r.dataState}</td>
                      <td>
                        {r.totalUsd
                          ? money(Math.round(Number(r.totalUsd) * 100), 'USD')
                          : r.amount !== undefined
                            ? money(r.amount, r.currency)
                            : '—'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Blank
            title="No matching work"
            detail="Try a different search or data view."
          />
        )}
        <footer>
          <span>
            {filtered.length} records · page {page + 1}
          </span>
          <div>
            <Button
              variant="ghost"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={(page + 1) * 30 >= filtered.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </footer>
      </section>
      {mode === 'dashboard' && (
        <section className="work-financial">
          <h3>Financial snapshot</h3>
          {(financial360(records.filter(includes), fy).summary as any[]).map(
            (s) => (
              <button
                key={s.label}
                onClick={() =>
                  go(
                    s.label.startsWith('Receivable')
                      ? 'receivables?currency=' + s.currency
                      : 'payables?currency=' + s.currency,
                  )
                }
              >
                <span>{s.label}</span>
                <strong>{money(s.balance, s.currency)}</strong>
              </button>
            ),
          )}
        </section>
      )}
      <p className="work-source-note">
        Data view: {view}.{' '}
        {view !== 'All data' && (
          <button onClick={() => setView('All data')}>
            Include all historical and imported records
          </button>
        )}
      </p>
    </div>
  );
}
export function LifecycleRail({
  flow,
  records,
  go,
  onAssign,
  canAssign = false,
}: {
  flow: any;
  records: any[];
  go: any;
  canAssign?: boolean;
  onAssign: (stage: any) => void;
}) {
  const [stage, setStage] = useState('');
  if (!flow?.stages.length) return null;
  const current = flow.stages.find((s: Stage) => s.key === stage);
  return (
    <section className="lifecycle-controller">
      <nav aria-label={flow.family + ' lifecycle'}>
        {flow.stages.map((s: Stage, i: number) => (
          <button
            key={s.key}
            data-state={s.status}
            aria-expanded={stage === s.key}
            onClick={() => setStage(stage === s.key ? '' : s.key)}
          >
            <span>{s.status === 'Completed' ? '✓' : i + 1}</span>
            <div>
              <strong>{s.label}</strong>
              <small>{s.status === 'Completed' ? 'Recorded' : s.status}</small>
            </div>
          </button>
        ))}
      </nav>
      {current && (
        <div className="lifecycle-stage">
          <header>
            <h3>{current.label}</h3>
            <button aria-label="Close stage" onClick={() => setStage('')}>
              Close
            </button>
          </header>
          <p>{current.nextAction}</p>
          <div className="stage-meta">
            <span>Owner: {current.owner}</span>
            <span>Due: {current.dueDate || 'Not assigned'}</span>
            <span>
              Depends on:{' '}
              {current.dependencies.join(', ') || 'Start of process'}
            </span>
          </div>
          <ul>
            {current.checks.map((c: any) => (
              <li key={c.key}>
                {c.complete ? '✓' : '○'} {c.label}
              </li>
            ))}
          </ul>
          <div className="stage-records">
            {current.recordIds.map((id: string) => {
              const r = records.find((r) => r.id === id);
              return (
                r && (
                  <button key={id} onClick={() => go(transactionLink(id))}>
                    {entityLabel(r)} <ArrowUpRight size={14} />
                  </button>
                )
              );
            })}
          </div>
          <Button variant="outline" onClick={() => go(current.route)}>
            Open {current.label.toLowerCase()} workspace
          </Button>
          {canAssign && current.status !== 'Completed' && (
            <Button onClick={() => onAssign(current)}>Assign task</Button>
          )}
        </div>
      )}
    </section>
  );
}
export function FinanceOverview({
  data,
  onDetails,
  go,
}: {
  data: any;
  onDetails: () => void;
  go: any;
}) {
  const types = [
    'invoices',
    'purchase-invoices',
    'receipts',
    'payments',
    'remittances',
    'forex',
    'incentives',
  ];
  return (
    <section className="finance-overview">
      <h3>Financial position</h3>
      <div className="finance-summary-lines">
        {data.financial.summary.map((s: any) => (
          <div key={s.label}>
            <span>{s.label}</span>
            <strong>{money(s.balance, s.currency)}</strong>
          </div>
        ))}
      </div>
      <div className="finance-counts">
        {types.map((kind) => {
          const rows = data.records.filter((r: any) => r.kind === kind);
          return rows.length ? (
            <details key={kind}>
              <summary>
                {kind.replaceAll('-', ' ')} <span>{rows.length} records</span>
              </summary>
              {rows.map((r: any) => (
                <button key={r.id} onClick={() => go(transactionLink(r.id))}>
                  {entityLabel(r)} <ArrowUpRight size={14} />
                </button>
              ))}
            </details>
          ) : null;
        })}
      </div>
      <Button variant="outline" onClick={onDetails}>
        View detailed reconciliation
      </Button>
      <p>Balances use recorded allocations, grouped by currency.</p>
    </section>
  );
}

export function ArchitectureMap({ role, go }: { role: string; go: any }) {
  const [q, setQ] = useState('');
  const entries = Object.values(opMap).filter(
    (m) =>
      canOpenWorkspace(m.key, role) &&
      (m.label + ' ' + m.group).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="architecture-map">
      <Input
        aria-label="Search architecture map"
        placeholder="Find module or business object…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <p>
        {entries.length} business objects · generated from the same definitions
        used by forms and permissions.
      </p>
      {entries.map((m) => (
        <details key={m.key}>
          <summary>
            {m.group} → {m.label}
          </summary>
          <p>
            <strong>Relationships:</strong>{' '}
            {m.fields
              .filter((f) => f.source)
              .map(
                (f) => f.label + ' → ' + (opMap[f.source!]?.label || f.source),
              )
              .join('; ') || 'No required parent record'}
          </p>
          <p>
            <strong>Required information:</strong>{' '}
            {m.fields
              .filter((f) => f.required)
              .map((f) => f.label)
              .join(', ') || 'See editor'}
          </p>
          <p>
            <strong>Documents:</strong>{' '}
            {m.documents.join(', ') || 'Supporting attachments'}
          </p>
          <p>
            <strong>Transitions:</strong>{' '}
            {Object.entries(m.transitions)
              .map(
                ([state, next]) =>
                  state + ' → ' + (next.join(' / ') || 'Final'),
              )
              .join('; ')}
          </p>
          <p>
            <strong>Roles:</strong> {m.roles.join(', ')}
          </p>
          <p>
            <strong>Pages:</strong> List → record workspace → editor; Overview,
            Documents, Finance, Items, Activity, Related.
          </p>
          <Button variant="outline" onClick={() => go(m.key)}>
            Open {m.label}
          </Button>
        </details>
      ))}
    </div>
  );
}
