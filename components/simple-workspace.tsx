'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ArrowUpRight,
  Plus,
  Folder,
  Download,
  FileText,
  Star,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  api,
  money,
  Status,
  Loading,
  Blank,
  dateLabel,
  exportCSV,
} from './erp-ui';
import { financial360 } from '@/lib/financial-360';
import { entityLabel, inactive } from '@/lib/relationships';
import { modules, pendingMenuRoutes, titles } from '@/lib/navigation';
import { opMap, operationRoutes } from '@/lib/operations';
import { canOpenWorkspace } from '@/lib/workspace-navigation';
import { reportRoutes } from './operation-reports';
const openRecord = (go: any, id: string, section = '') =>
  go(
    'record360?record=' +
      encodeURIComponent(id) +
      (section ? '&section=' + section : ''),
  );
const paymentStatus = (row: any) =>
  row.balance <= 0 ? 'Paid' : row.settled > 0 ? 'Part paid' : 'Unpaid';
export function SimpleDashboard({
  records,
  fy,
  go,
  role,
  loading,
  error,
  retry,
  start,
  end,
}: {
  records: any[];
  fy: string;
  go: any;
  role: string;
  loading: boolean;
  error: string;
  retry: () => void;
  start: string;
  end: string;
}) {
  const [currency, setCurrency] = useState('USD'),
    [view, setView] = useState('Recent sales');
  const finances = useMemo(
    () =>
      financial360(records, fy).lines.filter(
        (r) =>
          r.type === 'Receivable' &&
          r.fy === fy &&
          (!r.date || (r.date >= start && r.date <= end)),
      ),
    [records, fy, start, end],
  );
  const currencies = [...new Set<string>(finances.map((r) => r.currency))];
  const selected = currencies.includes(currency)
    ? currency
    : currencies[0] || 'INR';
  const balances = finances.filter((r) => r.currency === selected);
  const active = records.filter(
    (r) =>
      r.fy === fy &&
      !inactive(r) &&
      (!r.date || (r.date >= start && r.date <= end)),
  );
  const running = active
    .filter(
      (r) =>
        ['sales-orders', 'proformas', 'invoices'].includes(r.kind) &&
        !['Closed', 'Completed'].includes(r.status),
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const tasks = records
    .filter(
      (r) =>
        r.kind === 'tasks' && !['Completed', 'Cancelled'].includes(r.status),
    )
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="error-box">
        {error}
        <Button onClick={retry}>Retry</Button>
      </div>
    );
  return (
    <div className="simple-home">
      <div className="simple-quick">
        <span>Create or open</span>
        {[
          ['quotations', 'Quotation'],
          ['invoices', 'Invoice'],
          ['purchase-orders', 'Purchase order'],
          ['receipts', 'Receipt'],
        ]
          .filter(([r]) => canOpenWorkspace(r, role))
          .map(([r, l]) => (
            <Button key={r} variant="outline" onClick={() => go(r)}>
              {l}
              <ArrowUpRight size={15} />
            </Button>
          ))}
        <Button variant="outline" onClick={() => go('control-tower')}>
          Pending actions
        </Button>
      </div>
      <div className="simple-metrics">
        {role !== 'Logistics' && (
          <>
            <button
              onClick={() =>
                go(
                  'receivables?currency=' +
                    selected +
                    '&from=' +
                    start +
                    '&to=' +
                    end,
                )
              }
            >
              <span>Customer balance · {selected}</span>
              <strong>
                {money(
                  balances.reduce((n, r) => n + r.balance, 0),
                  selected,
                )}
              </strong>
              <small>
                {balances.filter((r) => r.balance > 0).length} invoices with a
                balance
              </small>
            </button>
            <button
              onClick={() =>
                go(
                  'receivables?currency=' +
                    selected +
                    '&from=' +
                    start +
                    '&to=' +
                    end,
                )
              }
            >
              <span>Invoice value · {selected}</span>
              <strong>
                {money(
                  balances.reduce((n, r) => n + r.amount, 0),
                  selected,
                )}
              </strong>
              <small>{balances.length} invoices in this period</small>
            </button>
          </>
        )}
        <button onClick={() => go('machines')}>
          <span>Equipment available</span>
          <strong>
            {
              records.filter(
                (r) => r.kind === 'machines' && r.status === 'Available',
              ).length
            }
          </strong>
          <small>Open equipment register</small>
        </button>
        <button onClick={() => go('tasks')}>
          <span>Open tasks</span>
          <strong>{tasks.length}</strong>
          <small>
            {
              tasks.filter(
                (r) =>
                  r.dueDate &&
                  r.dueDate < new Date().toISOString().slice(0, 10),
              ).length
            }{' '}
            past due date
          </small>
        </button>
      </div>
      <section className="widget simple-panel">
        <div className="simple-panel-head">
          <div className="simple-tabs">
            {[
              'Recent sales',
              ...(role !== 'Logistics' ? ['Customer balances'] : []),
              'Tasks',
            ].map((t) => (
              <button
                key={t}
                aria-current={view === t ? 'page' : undefined}
                onClick={() => setView(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {role !== 'Logistics' && (
            <label className="simple-inline-label">
              Currency
              <select
                value={selected}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {(currencies.length ? currencies : ['INR']).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="simple-table-wrap">
          {view === 'Recent sales' ? (
            <table>
              <thead>
                <tr>
                  <th>Order / invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Current status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {running.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => openRecord(go, r.id)}
                      >
                        {entityLabel(r)}
                      </button>
                    </td>
                    <td>
                      {r.customerName ||
                        records.find((p) => p.id === r.partnerId)?.name ||
                        '—'}
                    </td>
                    <td>{dateLabel(r.date)}</td>
                    <td>
                      <Status
                        value={r.sourceStatus || r.status || 'Recorded'}
                      />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() => openRecord(go, r.id)}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : view === 'Customer balances' ? (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Invoice value</th>
                  <th>Settled</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {balances
                  .filter((r) => r.balance > 0)
                  .slice(0, 10)
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => openRecord(go, r.id, 'Finance')}
                        >
                          {r.reference}
                        </button>
                      </td>
                      <td>{money(r.amount, r.currency)}</td>
                      <td>{money(r.settled, r.currency)}</td>
                      <td>{money(r.balance, r.currency)}</td>
                      <td>
                        <Status value={paymentStatus(r)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Owner</th>
                  <th>Due date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => openRecord(go, r.id)}
                      >
                        {r.name || r.reference}
                      </button>
                    </td>
                    <td>{r.owner || 'Unassigned'}</td>
                    <td>{dateLabel(r.dueDate)}</td>
                    <td>
                      <Status value={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="simple-panel-foot">
          <span>
            {view === 'Recent sales'
              ? running.length
              : view === 'Customer balances'
                ? balances.filter((r) => r.balance > 0).length
                : tasks.length}{' '}
            records
          </span>
          <Button
            variant="ghost"
            onClick={() =>
              go(
                view === 'Recent sales'
                  ? 'invoices'
                  : view === 'Customer balances'
                    ? 'receivables'
                    : 'tasks',
              )
            }
          >
            View all <ArrowUpRight size={14} />
          </Button>
        </div>
      </section>
      {role !== 'Logistics' && (
        <p className="simple-footnote">
          Balances include recorded allocations. Advances, credit notes and
          opening balances are reviewed separately in Finance.
        </p>
      )}
    </div>
  );
}
export function SimpleBalances({
  records,
  fy,
  go,
  direction,
}: {
  records: any[];
  fy: string;
  go: any;
  direction: 'Receivable' | 'Payable';
}) {
  const params = new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.search,
  );
  const [q, setQ] = useState(''),
    [status, setStatus] = useState(params.get('status') || 'All'),
    [currency, setCurrency] = useState(params.get('currency') || ''),
    [page, setPage] = useState(0);
  const data = useMemo(
    () =>
      financial360(records, fy).lines.filter(
        (r) =>
          r.type === direction &&
          r.fy === fy &&
          (!params.get('from') || !r.date || r.date >= params.get('from')!) &&
          (!params.get('to') || !r.date || r.date <= params.get('to')!),
      ),
    [records, fy, direction, params.get('from'), params.get('to')],
  );
  const currencies = [...new Set<string>(data.map((r) => r.currency))];
  const current = currencies.includes(currency)
    ? currency
    : currencies[0] || 'INR';
  const rows = data.filter(
    (r) =>
      r.currency === current &&
      (status === 'All' || paymentStatus(r) === status) &&
      JSON.stringify({
        ...r,
        party: records.find(
          (x) => x.id === records.find((i) => i.id === r.id)?.partnerId,
        )?.name,
      })
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  useEffect(() => {
    setPage(0);
  }, [q, status, current, fy, direction]);
  const totals = rows.reduce(
    (o, r) => ({
      amount: o.amount + r.amount,
      settled: o.settled + r.settled,
      balance: o.balance + r.balance,
    }),
    { amount: 0, settled: 0, balance: 0 },
  );
  return (
    <div className="simple-workspace">
      <div className="simple-toolbar">
        <Input
          aria-label="Search invoice or party"
          placeholder="Search invoice or party…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label>
          Currency
          <select value={current} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            exportCSV(
              rows.map((r) => ({
                ...r,
                amount: r.amount / 100,
                settled: r.settled / 100,
                balance: r.balance / 100,
              })),
              direction + ' balances',
            )
          }
        >
          Export
        </Button>
        <Button
          onClick={() =>
            go(direction === 'Receivable' ? 'receipts' : 'payments')
          }
        >
          Open {direction === 'Receivable' ? 'receipts' : 'payments'}
        </Button>
      </div>
      {(params.get('from') || params.get('to')) && (
        <p className="simple-footnote">
          Period: {params.get('from') || 'Start of year'} to{' '}
          {params.get('to') || 'End of year'}
        </p>
      )}
      <div className="simple-tabs">
        {['All', 'Unpaid', 'Part paid', 'Paid'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            aria-current={s === status ? 'page' : undefined}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="simple-metrics three">
        {[
          ['Invoice value', totals.amount],
          ['Settled', totals.settled],
          ['Balance', totals.balance],
        ].map(([k, v]) => (
          <div key={k}>
            <span>
              {k} · {current}
            </span>
            <strong>{money(Number(v), current)}</strong>
          </div>
        ))}
      </div>
      <section className="widget simple-panel">
        <div className="simple-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>{direction === 'Receivable' ? 'Customer' : 'Supplier'}</th>
                <th>Date</th>
                <th>Value</th>
                <th>Settled</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 25, page * 25 + 25).map((r) => (
                <tr key={r.id}>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => openRecord(go, r.id, 'Finance')}
                    >
                      {r.reference}
                    </button>
                  </td>
                  <td>
                    {records.find(
                      (x) =>
                        x.id === records.find((i) => i.id === r.id)?.partnerId,
                    )?.name || '—'}
                  </td>
                  <td>{dateLabel(r.date)}</td>
                  <td>{money(r.amount, current)}</td>
                  <td>{money(r.settled, current)}</td>
                  <td>{money(r.balance, current)}</td>
                  <td>
                    <Status value={paymentStatus(r)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Blank
            title="No matching invoices"
            detail="Try another currency, status or financial year."
          />
        )}
        <div className="simple-panel-foot">
          <span>
            {rows.length} invoices · page {page + 1}
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
              disabled={(page + 1) * 25 >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
      <p className="simple-footnote">
        Invoice balances use recorded allocations. Advances and unallocated
        credit/debit notes are separate. Historical records have not been posted
        to the general ledger.
      </p>
    </div>
  );
}
export function WorkspaceCatalog({
  mode,
  role,
  go,
}: {
  mode: 'reports' | 'settings' | 'all';
  role: string;
  go: any;
}) {
  const [q, setQ] = useState('');
  let entries: any[] = [];
  if (mode === 'reports')
    entries = Object.entries(reportRoutes)
      .filter(([r, c]) => c.mode !== 'documents' && !r.startsWith('documents'))
      .map(([route, c]) => ({
        route,
        label: c.title,
        group:
          c.mode === 'outstanding'
            ? 'Finance'
            : c.title.includes('Stock') || c.title.includes('Inventory')
              ? 'Inventory'
              : 'Reports',
      }));
  else if (mode === 'settings')
    entries = [
      { route: 'masters', label: 'Master data', group: 'Company & setup' },
      {
        route: 'settings',
        label: 'Workspace preferences',
        group: 'Company & setup',
      },
      {
        route: 'master-company-information',
        label: 'Company information',
        group: 'Company & setup',
      },
      {
        route: 'workbook-data',
        label: 'Imported data & reconciliation',
        group: 'Data',
      },
      {
        route: 'data-dictionary',
        label: 'Field definitions & calculation rules',
        group: 'Data',
      },
      {
        route: 'users',
        label: 'Users & permissions',
        group: 'Access & history',
      },
      { route: 'audit', label: 'Audit history', group: 'Access & history' },
      { route: 'profile', label: 'My profile', group: 'Access & history' },
      { route: 'help', label: 'Help', group: 'Access & history' },
    ];
  else
    entries = [
      { route: 'control-tower', label: 'Pending actions', group: 'Work' },
      { route: 'tasks', label: 'Tasks', group: 'Work' },
      ...modules.flatMap((m) =>
        m.items.map(([, route, label]) => ({ route, label, group: m.label })),
      ),
    ];
  const unique = new Set<string>();
  entries = entries
    .filter((e) => {
      const key = operationRoutes[e.route] || e.route;
      if (
        unique.has(key) ||
        pendingMenuRoutes.has(e.route) ||
        !canOpenWorkspace(key, role)
      )
        return false;
      unique.add(key);
      return true;
    })
    .filter((e) =>
      (e.label + ' ' + e.group).toLowerCase().includes(q.toLowerCase()),
    );
  const groups = [...new Set(entries.map((e) => e.group))];
  return (
    <div className="simple-workspace">
      <div className="simple-toolbar">
        <Search size={18} />
        <Input
          aria-label="Find a page"
          placeholder={
            mode === 'reports'
              ? 'Find a report…'
              : mode === 'settings'
                ? 'Find a setting…'
                : 'Find any tool…'
          }
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span>{entries.length} pages</span>
      </div>
      <div className="simple-catalog">
        {groups.map((group) => (
          <section className="widget" key={group}>
            <h2>{group}</h2>
            {entries
              .filter((e) => e.group === group)
              .map((e) => (
                <button key={e.route} onClick={() => go(e.route)}>
                  <FileText size={16} />
                  <span>{e.label}</span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
          </section>
        ))}
      </div>
      {!entries.length && (
        <Blank title="No matching pages" detail="Try a shorter name." />
      )}
    </div>
  );
}
export function SimpleDocumentDrive({
  records,
  fy,
  go,
}: {
  records: any[];
  fy: string;
  go: any;
}) {
  const [files, setFiles] = useState<any[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [q, setQ] = useState(''),
    [view, setView] = useState('Invoice folders'),
    [page, setPage] = useState(0),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setBusy(true);
    api('operations/documents')
      .then((d) => live && setFiles(d))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [retry]);
  useEffect(() => setPage(0), [q, view, fy]);
  const invoices = records.filter(
    (r) =>
      ['invoices', 'domestic-invoices', 'proformas'].includes(r.kind) &&
      r.fy === fy &&
      JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
  );
  const scoped = files.filter(
    (f) =>
      records.some((r) => r.id === f.entityId && r.fy === fy) &&
      JSON.stringify(f).toLowerCase().includes(q.toLowerCase()),
  );
  if (busy) return <Loading />;
  if (error)
    return (
      <div className="error-box">
        {error}
        <Button
          onClick={() => {
            setError('');
            setRetry(retry + 1);
          }}
        >
          Retry
        </Button>
      </div>
    );
  const list =
    view === 'Invoice folders'
      ? invoices
      : scoped.filter((f) => view !== 'Photos' || f.mime?.startsWith('image/'));
  return (
    <div className="simple-workspace">
      <div className="simple-toolbar">
        <Input
          aria-label="Search document folders"
          placeholder="Search invoice or document…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => go('master-document-templates')}
        >
          Document templates
        </Button>
      </div>
      <div className="simple-tabs">
        {['Invoice folders', 'All documents', 'Photos'].map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            aria-current={view === t ? 'page' : undefined}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="widget simple-panel">
        <div className="simple-table-wrap">
          <table>
            <thead>
              <tr>
                {(view === 'Invoice folders'
                  ? ['Invoice / proforma', 'Customer', 'Date', 'Files', '']
                  : ['Document', 'Type', 'Version', 'Status', '']
                ).map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.slice(page * 25, page * 25 + 25).map((r) => (
                <tr key={r.id}>
                  {view === 'Invoice folders' ? (
                    <>
                      <td>
                        <button
                          className="simple-folder"
                          onClick={() => openRecord(go, r.id, 'Documents')}
                        >
                          <Folder size={19} />
                          {entityLabel(r)}
                        </button>
                      </td>
                      <td>
                        {r.customerName ||
                          records.find((c) => c.id === r.partnerId)?.name ||
                          '—'}
                      </td>
                      <td>{dateLabel(r.date)}</td>
                      <td>{files.filter((f) => f.entityId === r.id).length}</td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() => openRecord(go, r.id, 'Documents')}
                        >
                          Open folder
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.filename}</td>
                      <td>{r.category}</td>
                      <td>{r.documentVersion || r.version || 1}</td>
                      <td>
                        <Status value={r.status} />
                      </td>
                      <td>
                        <a
                          href={
                            '/api/v1/operations/documents/' +
                            encodeURIComponent(r.id)
                          }
                          className="text-link"
                        >
                          Download
                        </a>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            openRecord(go, r.entityId, 'Documents')
                          }
                        >
                          Open invoice
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Blank
            title={
              view === 'Invoice folders'
                ? 'No invoices in this financial year'
                : 'No matching files'
            }
            detail="Open an invoice folder to upload a supporting document."
          />
        )}
        <div className="simple-panel-foot">
          <span>
            {list.length} {view === 'Invoice folders' ? 'folders' : 'files'}
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
              disabled={(page + 1) * 25 >= list.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
