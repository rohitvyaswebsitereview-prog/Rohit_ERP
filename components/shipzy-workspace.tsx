'use client';
import { useEffect, useState } from 'react';
import {
  Menu,
  Search,
  Settings,
  Clock,
  Bell,
  UserRound,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Plus,
  ArrowUpRight,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  api,
  money,
  exportCSV,
  Loading,
  Blank,
  Status,
  dateLabel,
} from './erp-ui';
import { shipzyMenus, shipzyTitle } from '@/lib/shipzy-navigation';
import { opMap, operationRoutes, permittedOperation } from '@/lib/operations';
import { masterCategories } from '@/lib/masters';
import { titles } from '@/lib/navigation';
import { salesKinds, quoteStates } from '@/lib/sales-engine';
import { financial360 } from '@/lib/financial-360';
import { entityLabel, inactive } from '@/lib/relationships';
import { canOpenWorkspace } from '@/lib/workspace-navigation';
import { useDataView } from './data-view';
import { Documents } from './operations';
import { reportRoutes } from './operation-reports';
const recordLink = (r: any, tab = 'General') =>
  r.kind +
  '?record=' +
  encodeURIComponent(r.id) +
  '&tab=' +
  encodeURIComponent(tab);
const label = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());
const hiddenField = (k: string) =>
  [
    'id',
    'kind',
    'operation',
    'version',
    'importLocked',
    'importBatch',
    'sourceFacts',
    'sourceWorkbook',
    'sourceAmountExact',
    'sourceId',
    'partnerId',
    'dataState',
  ].includes(k) ||
  k.startsWith('source') ||
  k.endsWith('Id');
export default function ShipzyWorkspace({
  user,
  onLogout,
  renderLegacy,
}: {
  user: any;
  onLogout: () => void;
  renderLegacy: (props: any) => React.ReactNode;
}) {
  const [url, setUrl] = useState('dashboard'),
    [fy, setFy] = useState('2026–27'),
    [records, setRecords] = useState<any[]>([]),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [collapsed, setCollapsed] = useState(false),
    [expanded, setExpanded] = useState(''),
    [search, setSearch] = useState(''),
    [results, setResults] = useState<any[] | null>(null),
    [searchError, setSearchError] = useState('');
  const { setView } = useDataView();
  const refresh = () => setRevision((v) => v + 1);
  const go = (r: string) => {
    window.history.pushState({}, '', r === 'dashboard' ? '/' : '/' + r);
    setUrl(r);
    setResults(null);
    setSearch('');
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    setView('All data');
    if (window.matchMedia('(max-width:700px)').matches) setCollapsed(true);
    const read = () =>
      setUrl(
        window.location.pathname.slice(1) + window.location.search ||
          'dashboard',
      );
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    api('records')
      .then((r) => live && setRecords(r))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [revision]);
  const [raw, query = ''] = url.split('?'),
    params = new URLSearchParams(query),
    route = operationRoutes[raw] || raw,
    selected = records.find((r) => r.id === params.get('record')),
    m = opMap[route];
  const can = (r: string) => canOpenWorkspace(r, user.role),
    name =
      shipzyTitle(route) || titles[route] || opMap[route]?.label || 'Workspace';
  async function find(e: any) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearchError('');
    try {
      setResults(
        await api(
          'relationships/search?q=' +
            encodeURIComponent(search) +
            '&view=All%20data',
        ),
      );
    } catch (e: any) {
      setSearchError(e.message);
    }
  }
  const legacy = (target = route) =>
    renderLegacy({
      route: target,
      shell: 'shipzy',
      fy,
      records,
      filter: '',
      refresh,
      go,
      user,
      canWrite: user.role !== 'Viewer',
      notifications: [],
      changeFy: setFy,
    });
  const editing =
    params.has('create') || params.has('edit') || params.has('actions');
  return (
    <div className={'shipzy-app' + (collapsed ? ' shipzy-collapsed' : '')}>
      <aside className="shipzy-sidebar">
        <a
          className="shipzy-brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            go('dashboard');
          }}
        >
          <span>R</span>
          <strong>
            Rohit's <em>ERP</em>
          </strong>
        </a>
        <nav aria-label="Main menu">
          {shipzyMenus
            .filter((n) =>
              n.children ? n.children.some(([r]) => can(r)) : can(n.route),
            )
            .map((n) => {
              const Icon = n.icon,
                active =
                  n.route === route || n.children?.some(([r]) => r === route);
              return (
                <div
                  key={n.route}
                  className={active ? 'shipzy-nav-active' : ''}
                >
                  <button
                    title={n.title}
                    onClick={() =>
                      n.children
                        ? (setCollapsed(false),
                          setExpanded(expanded === n.route ? '' : n.route))
                        : go(n.route)
                    }
                    aria-expanded={
                      n.children ? expanded === n.route : undefined
                    }
                  >
                    <Icon size={18} />
                    <span>{n.title}</span>
                    {n.children && <ChevronDown size={14} />}
                  </button>
                  {n.children && expanded === n.route && !collapsed && (
                    <div className="shipzy-submenu">
                      {n.children
                        .filter(([r]) => can(r))
                        .map(([r, l]) => (
                          <button
                            key={r}
                            className={route === r ? 'selected' : ''}
                            onClick={() => go(r)}
                          >
                            {l}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>
      </aside>
      <div className="shipzy-main">
        <header className="shipzy-header">
          <button
            aria-label="Toggle menu"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu size={23} />
          </button>
          <h1>{name}</h1>
          <form onSubmit={find}>
            <Input
              aria-label="Search ERP"
              placeholder="Search invoices, products, settings and more"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button aria-label="Search">
              <Search size={20} />
            </button>
          </form>
          <label className="shipzy-year">
            <span className="sr-only">Financial year</span>
            <select value={fy} onChange={(e) => setFy(e.target.value)}>
              {['2026–27', '2025–26', '2024–25'].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </label>
          <button
            title="Activity"
            aria-label="Activity"
            onClick={() => go(user.role === 'Admin' ? 'audit' : 'tasks')}
          >
            <Clock size={23} />
          </button>
          <button
            title="Master settings"
            aria-label="Master settings"
            onClick={() => go('masters')}
          >
            <Settings size={23} />
          </button>
          <button
            title="Alerts"
            aria-label="Alerts"
            onClick={() => go('tasks')}
          >
            <Bell size={23} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<button aria-label="User menu" />}>
              <UserRound size={24} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => go('profile')}>
                {user.name}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await api('logout', {});
                  onLogout();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="shipzy-content">
          {searchError && <p className="error-box">{searchError}</p>}
          {results ? (
            <section className="shipzy-panel">
              <header>
                <h2>Search results</h2>
                <Button variant="outline" onClick={() => setResults(null)}>
                  Close
                </Button>
              </header>
              {results.map((r) => (
                <button
                  className="shipzy-search-result"
                  key={r.id}
                  onClick={() => go(recordLink(r))}
                >
                  <span>{opMap[r.kind]?.label || r.kind}</span>
                  <strong>{entityLabel(r)}</strong>
                  <ArrowUpRight size={16} />
                </button>
              ))}
              {!results.length && <Blank title="No matching records" />}
            </section>
          ) : error ? (
            <div className="error-box">
              {error}
              <Button onClick={refresh}>Retry</Button>
            </div>
          ) : loading ? (
            <Loading />
          ) : editing ? (
            <div className="shipzy-editor">
              <div className="shipzy-editor-title">
                <Button variant="outline" onClick={() => go(route)}>
                  ← Back to list
                </Button>
                <h2>
                  {params.has('create') ? 'Add New' : 'Edit'} {name}
                </h2>
              </div>
              {legacy()}
            </div>
          ) : params.get('record') ? (
            <ShipzyRecord
              key={params.get('record') + query}
              id={params.get('record')!}
              initialTab={params.get('tab') || 'General'}
              go={go}
              user={user}
              refreshParent={refresh}
            />
          ) : route === 'dashboard' ? (
            <ShipzyDashboard records={records} fy={fy} go={go} />
          ) : ['masters', 'logistics-master'].includes(route) ? (
            <ShipzyMasters
              role={user.role}
              go={go}
              logistics={route === 'logistics-master'}
            />
          ) : [
              'documents-drive',
              'pre-shipment',
              'post-shipment',
              'packing-drive',
              'export-docs',
            ].includes(route) ? (
            <ShipzyDrive records={records} fy={fy} go={go} route={route} />
          ) : ['receivables', 'payables'].includes(route) ? (
            <ShipzyPayments
              records={records}
              fy={fy}
              go={go}
              payable={route === 'payables'}
            />
          ) : route === 'reports' ? (
            <ShipzyReports go={go} role={user.role} />
          ) : m ? (
            <ShipzyRegister
              key={route + fy}
              records={records}
              fy={fy}
              kind={route}
              go={go}
              user={user}
            />
          ) : route === 'shipments' ? (
            <ShipzyRegister
              records={records}
              fy={fy}
              kind="shipments"
              go={go}
              user={user}
            />
          ) : ['transactions', 'record360'].includes(route) ? (
            <ShipzyRegister
              records={records}
              fy={fy}
              kind="invoices"
              go={go}
              user={user}
            />
          ) : route === 'shipment-checklist' ? (
            <ShipzyChecklist fy={fy} go={go} />
          ) : route === 'costing' ? (
            legacy('profitability')
          ) : (
            legacy()
          )}
        </main>
        <footer className="shipzy-footer">
          Rohit's ERP{' '}
          <span>
            FY {fy} · {records.length} records
          </span>
        </footer>
      </div>
    </div>
  );
}
function ShipzyTotals({ records, fy }: { records: any[]; fy: string }) {
  const [currency, setCurrency] = useState(
    records.some((r) => r.totalUsd || r.currency === 'USD') ? 'USD' : 'INR',
  );
  const lines = financial360(records, fy).lines.filter(
    (r) => r.fy === fy && r.currency === currency,
  );
  const sales = lines.filter((r) => r.type === 'Receivable'),
    expenses = lines.filter((r) => r.type === 'Payable');
  return (
    <div className="shipzy-totals">
      <label>
        Currency
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {[
            ...new Set([
              'INR',
              'USD',
              ...records.map((r) => r.currency).filter(Boolean),
            ]),
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {[
        ['Total Sales', sales.reduce((a, r) => a + r.amount, 0)],
        ['Total Receipts', sales.reduce((a, r) => a + r.settled, 0)],
        ['Total Due', sales.reduce((a, r) => a + r.balance, 0)],
        ['Total Expenses', expenses.reduce((a, r) => a + r.amount, 0)],
      ].map(([k, v]) => (
        <div key={k}>
          <span>{k}</span>
          <strong>{money(Number(v), currency)}</strong>
          <FileText size={26} />
        </div>
      ))}
    </div>
  );
}
function ShipzyDashboard({
  records,
  fy,
  go,
}: {
  records: any[];
  fy: string;
  go: any;
}) {
  const [q, setQ] = useState(''),
    [product, setProduct] = useState(''),
    [currency, setCurrency] = useState('USD');
  const balances = financial360(records, fy).lines.filter(
    (r) =>
      r.fy === fy &&
      r.type === 'Receivable' &&
      r.currency === currency &&
      r.balance > 0 &&
      JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
  );
  const orders = records
    .filter(
      (r) =>
        ['invoices', 'proformas'].includes(r.kind) &&
        r.fy === fy &&
        !inactive(r),
    )
    .slice(0, 4);
  const products = records.filter((r) => r.kind === 'products');
  const selected = product;
  const months = Array.from({ length: 12 }, (_, i) => (i + 3) % 12);
  const values = months.map((month) =>
    records
      .filter(
        (r) =>
          r.kind === 'invoices' &&
          r.fy === fy &&
          r.currency === 'INR' &&
          !inactive(r) &&
          Number(r.date?.slice(5, 7)) - 1 === month,
      )
      .reduce(
        (n, r) =>
          n +
          (r.lines || [])
            .filter(
              (l: any) =>
                !selected ||
                l.productId === selected ||
                String(l.description || '')
                  .toLowerCase()
                  .includes(
                    String(
                      products.find((p) => p.id === selected)?.name ||
                        '__no_match__',
                    ).toLowerCase(),
                  ),
            )
            .reduce((a: number, l: any) => a + Number(l.total || 0), 0),
        0,
      ),
  );
  const max = Math.max(1, ...values);
  return (
    <>
      <ShipzyTotals records={records} fy={fy} />
      <section className="shipzy-panel">
        <header>
          <h2>Running Order Status</h2>
          <Button variant="outline" onClick={() => go('invoices')}>
            View All
          </Button>
        </header>
        <div className="shipzy-order-grid">
          {orders.map((r) => (
            <button key={r.id} onClick={() => go(recordLink(r))}>
              <strong>{entityLabel(r)}</strong>
              <span>
                {r.customerName ||
                  records.find((p) => p.id === r.partnerId)?.name ||
                  '—'}
              </span>
              <small>{dateLabel(r.date)}</small>
              <p>{r.sourceStatus || r.status}</p>
            </button>
          ))}
        </div>
      </section>
      <div className="shipzy-dashboard-grid">
        <section className="shipzy-panel">
          <header>
            <h2>Payment Receivables</h2>
            <Input
              aria-label="Search receivables"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </header>
          <label className="shipzy-inline">
            Currency
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option>USD</option>
              <option>INR</option>
            </select>
          </label>
          <div className="shipzy-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SR NO</th>
                  <th>INVOICE NO.</th>
                  <th>CUSTOMER</th>
                  <th>INVOICE AMT</th>
                  <th>PENDING AMT</th>
                </tr>
              </thead>
              <tbody>
                {balances.slice(0, 8).map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>
                      <button
                        onClick={() =>
                          go('invoices?record=' + encodeURIComponent(r.id))
                        }
                      >
                        {r.reference}
                      </button>
                    </td>
                    <td>
                      {records.find(
                        (p) =>
                          p.id ===
                          records.find((x) => x.id === r.id)?.partnerId,
                      )?.name || '—'}
                    </td>
                    <td>{money(r.amount, r.currency)}</td>
                    <td>{money(r.balance, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!balances.length && <Blank title="No pending receivables" />}
          <footer>
            Showing {Math.min(balances.length, 8)} of {balances.length} entries{' '}
            <button onClick={() => go('receivables')}>View all</button>
          </footer>
        </section>
        <section className="shipzy-panel">
          <header>
            <h2>Product Wise Sales</h2>
            <span>This Fiscal Year</span>
          </header>
          <label className="shipzy-product-select">
            Select Product
            <select
              value={selected || ''}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <p className="shipzy-chart-key">■ Product Sales · INR</p>
          <div className="shipzy-chart">
            {values.map((v, i) => (
              <div key={i}>
                <span
                  title={money(v, 'INR')}
                  style={{ height: `${(v / max) * 210}px` }}
                />
                <small>
                  {new Date(2026, months[i], 1).toLocaleString('en', {
                    month: 'short',
                  })}
                </small>
              </div>
            ))}
          </div>
          {!values.some(Boolean) && (
            <p className="shipzy-muted">
              No INR sales lines linked to this product.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
export function ShipzyRegister({
  records,
  fy,
  kind,
  go,
  user,
}: {
  records: any[];
  fy: string;
  kind: string;
  go: any;
  user: any;
}) {
  const [q, setQ] = useState(''),
    [status, setStatus] = useState('All'),
    [size, setSize] = useState(10),
    [page, setPage] = useState(0);
  const m = opMap[kind],
    master = !!m.master,
    rows = records.filter(
      (r) =>
        r.kind === kind &&
        (master || r.fy === fy) &&
        JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) &&
        (status === 'All' ||
          (status === 'Running Contract' &&
            !['Completed', 'Closed', 'Cancelled'].includes(r.status)) ||
          (status === 'Completed' &&
            ['Completed', 'Closed'].includes(r.status)) ||
          r.status === status),
    );
  useEffect(() => setPage(0), [q, status, size]);
  const sales = salesKinds.includes(kind),
    products = kind === 'products',
    parties = ['customers', 'vendors'].includes(kind);
  return (
    <>
      {!master && (
        <ShipzyTotals records={records.filter((r) => !inactive(r))} fy={fy} />
      )}
      <section className="shipzy-panel shipzy-register">
        {!master && (
          <nav className="shipzy-tabs">
            {(kind === 'proformas'
              ? ['All', 'Running Contract', 'Completed']
              : kind === 'ebrc'
                ? ['All', 'Pending', 'Completed']
                : [
                    'All',
                    ...new Set(
                      records
                        .filter((r) => r.kind === kind)
                        .map((r) => r.status)
                        .filter(Boolean),
                    ),
                  ]
            ).map((s) => (
              <button
                key={s}
                className={status === s ? 'active' : ''}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </nav>
        )}
        <div className="shipzy-table-toolbar">
          <label>
            Show{' '}
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>{' '}
            Entries
          </label>
          <div>
            <label>
              Search:{' '}
              <Input
                aria-label={'Search ' + m.label}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {permittedOperation(m, user.role, true) && (
              <Button onClick={() => go(kind + '?create=1')}>Add New</Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                exportCSV(
                  rows.map((r) => ({
                    reference: entityLabel(r),
                    date: r.date,
                    status: r.status,
                    currency: r.currency,
                    amount: r.amount === undefined ? '' : r.amount / 100,
                  })),
                  m.label,
                )
              }
            >
              Export
            </Button>
          </div>
        </div>
        <div className="shipzy-table-scroll">
          <table>
            <thead>
              <tr>
                <th>ACTION</th>
                <th>DOC</th>
                <th>
                  {products
                    ? 'PRODUCT NAME'
                    : parties
                      ? 'NAME'
                      : kind === 'machines'
                        ? 'SERIAL NO.'
                        : kind === 'proformas'
                          ? 'PI NO.'
                          : 'REFERENCE'}
                </th>
                {sales ? (
                  <>
                    <th>CONSIGNEE</th>
                    <th>PRODUCTS</th>
                    <th>COUNTRY</th>
                    <th>PORT</th>
                  </>
                ) : products ? (
                  <>
                    <th>HSN / SAC</th>
                    <th>GST</th>
                    <th>DESCRIPTION</th>
                  </>
                ) : parties ? (
                  <>
                    <th>EMAIL</th>
                    <th>COUNTRY</th>
                    <th>ADDRESS</th>
                  </>
                ) : (
                  <>
                    <th>DATE</th>
                    <th>{master ? 'DETAILS' : 'CUSTOMER / SUPPLIER'}</th>
                    <th>AMOUNT</th>
                  </>
                )}
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * size, page * size + size).map((r) => (
                <tr key={r.id}>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button className="shipzy-action" />}
                      >
                        Action <ChevronDown size={13} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => go(recordLink(r))}>
                          View
                        </DropdownMenuItem>
                        {!r.importLocked &&
                          permittedOperation(m, user.role, true) && (
                            <DropdownMenuItem
                              onClick={() =>
                                go(
                                  kind +
                                    '?record=' +
                                    encodeURIComponent(r.id) +
                                    '&edit=1',
                                )
                              }
                            >
                              Edit
                            </DropdownMenuItem>
                          )}
                        <DropdownMenuItem
                          onClick={() => go(recordLink(r, 'Documents'))}
                        >
                          Documents / Print
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => go(recordLink(r, 'Activity'))}
                        >
                          Activity
                        </DropdownMenuItem>
                        {!r.importLocked && (
                          <DropdownMenuItem
                            onClick={() => go(recordLink(r, 'Actions'))}
                          >
                            Status / Convert / Cancel
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td>
                    <button
                      className="shipzy-document-icon"
                      aria-label={'Documents for ' + entityLabel(r)}
                      onClick={() => go(recordLink(r, 'Documents'))}
                    >
                      <FileText size={19} />
                    </button>
                  </td>
                  <td>
                    <button
                      className="shipzy-link"
                      onClick={() => go(recordLink(r))}
                    >
                      {r.serialNumber || entityLabel(r)}
                    </button>
                  </td>
                  {sales ? (
                    <>
                      <td>
                        {r.customerName ||
                          records.find((p) => p.id === r.partnerId)?.name ||
                          '—'}
                      </td>
                      <td className="shipzy-description">
                        {(r.lines || [])
                          .map(
                            (l: any) =>
                              l.description +
                              ' (' +
                              (l.quantity || '—') +
                              ' ' +
                              (l.uom || '') +
                              ')',
                          )
                          .join('; ') || '—'}
                      </td>
                      <td>{r.country || r.destination || '—'}</td>
                      <td>{r.portOfDischarge || r.dischargePort || '—'}</td>
                    </>
                  ) : products ? (
                    <>
                      <td>{r.hsn || '—'}</td>
                      <td>{r.gstRate ?? '—'}</td>
                      <td className="shipzy-description">
                        {r.specification || r.description || '—'}
                      </td>
                    </>
                  ) : parties ? (
                    <>
                      <td>{r.email || '—'}</td>
                      <td>{r.country || '—'}</td>
                      <td className="shipzy-description">
                        {r.address || r.billingAddress || '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.date || '—'}</td>
                      <td>
                        {records.find((p) => p.id === r.partnerId)?.name ||
                          r.description ||
                          r.location ||
                          '—'}
                      </td>
                      <td>
                        {r.amount !== undefined
                          ? money(r.amount, r.currency || 'INR')
                          : '—'}
                      </td>
                    </>
                  )}
                  <td>
                    <span className="shipzy-status">
                      {r.sourceStatus || r.status || 'Recorded'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Blank
            title="No records found"
            detail="Change your search or add a new record."
          />
        )}
        <footer>
          <span>
            Showing {rows.length ? page * size + 1 : 0} to{' '}
            {Math.min((page + 1) * size, rows.length)} of {rows.length} entries
          </span>
          <div>
            <Button
              variant="outline"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="shipzy-page">{page + 1}</span>
            <Button
              variant="outline"
              disabled={(page + 1) * size >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </footer>
      </section>
    </>
  );
}
function ShipzyRecord({
  id,
  initialTab,
  go,
  user,
  refreshParent,
}: {
  id: string;
  initialTab: string;
  go: any;
  user: any;
  refreshParent: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [files, setFiles] = useState<any[]>([]),
    [tab, setTab] = useState(initialTab === 'Actions' ? 'General' : initialTab),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [action, setAction] = useState(initialTab === 'Actions' ? 'status' : ''),
    [target, setTarget] = useState(''),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setError('');
    Promise.all([
      api('relationships/' + encodeURIComponent(id)),
      api('operations/documents'),
    ])
      .then(([d, f]) => {
        if (live) {
          setData(d);
          setFiles(f);
        }
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [id, revision]);
  if (!data)
    return error ? (
      <div className="error-box">
        {error}
        <Button onClick={() => setRevision((v) => v + 1)}>Retry</Button>
      </div>
    ) : (
      <Loading />
    );
  const r = data.record,
    m = opMap[r.kind],
    canWrite = m && permittedOperation(m, user.role, true),
    sales = salesKinds.includes(r.kind),
    locked = r.importLocked || r.status === 'Imported';
  const tabs = [
    'General',
    'Product Details',
    'Commercial Details',
    'Shipment Details',
    'Documents',
    'Activity',
  ];
  const transitions = sales
    ? quoteStates[r.status] || []
    : m?.transitions[r.status] || [];
  const fields = Object.entries(r).filter(
    ([k, v]) =>
      !hiddenField(k) &&
      v !== null &&
      v !== undefined &&
      v !== '' &&
      typeof v !== 'object',
  );
  const category = (k: string) =>
    /amount|currency|rate|gst|tax|tcs|tds|total|price|payment|bank|discount|cost/i.test(
      k,
    )
      ? 'Commercial Details'
      : /port|ship|consign|notify|vessel|container|etd|eta|country|destination|delivery|transport/i.test(
            k,
          )
        ? 'Shipment Details'
        : 'General';
  const displayed = fields.filter(([k]) => category(k) === tab);
  async function perform() {
    if (!target || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      const service =
        sales && (action !== 'convert' || salesKinds.includes(target))
          ? 'sales'
          : 'operations';
      const result = await api(`${service}/${r.kind}/${r.id}/${action}`, {
        version: r.version,
        reason,
        status: action === 'status' ? target : undefined,
        target: action === 'convert' ? target : undefined,
      });
      setAction('');
      setTarget('');
      setReason('');
      setRevision((v) => v + 1);
      refreshParent();
      if (result.id && result.id !== id)
        go(
          (result.kind || target) + '?record=' + encodeURIComponent(result.id),
        );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="shipzy-panel shipzy-record">
      <header>
        <div>
          <Button variant="outline" onClick={() => go(r.kind)}>
            ← Back
          </Button>
          <h2>{entityLabel(r)}</h2>
          <span>{r.party || r.customerName || r.name}</span>
        </div>
        <div>
          {canWrite && !locked && (
            <Button
              onClick={() =>
                go(r.kind + '?record=' + encodeURIComponent(id) + '&edit=1')
              }
            >
              Edit
            </Button>
          )}
          <Button variant="outline" onClick={() => setTab('Documents')}>
            Create Document
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button className="shipzy-action" />}>
              Action <ChevronDown size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => window.print()}>
                Print / Save PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTab('Documents')}>
                Upload / Download Documents
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTab('Activity')}>
                Activity
              </DropdownMenuItem>
              {canWrite && !locked && (
                <>
                  <DropdownMenuItem
                    disabled={!transitions.length}
                    onClick={() => {
                      setAction('status');
                      setTarget('');
                    }}
                  >
                    Change Status
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!m?.convert?.length}
                    onClick={() => {
                      setAction('convert');
                      setTarget('');
                    }}
                  >
                    Convert / Create Next Document
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {error && <div className="error-box">{error}</div>}
      <nav className="shipzy-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {['General', 'Commercial Details', 'Shipment Details'].includes(tab) && (
        <div className="shipzy-form-grid">
          {tab === 'General' && r.partnerId && (
            <label>
              Customer / Supplier
              <div>
                {data.records.find((x: any) => x.id === r.partnerId)?.name ||
                  r.party ||
                  '—'}
              </div>
            </label>
          )}
          {displayed.map(([k, v]) => (
            <label key={k}>
              {m?.fields.find((f) => f.key === k)?.label || label(k)}
              <div>
                {k === 'amount'
                  ? money(Number(v), r.currency || 'INR')
                  : String(v)}
              </div>
            </label>
          ))}
          {(m?.fields || [])
            .filter((f) => f.source && category(f.key) === tab && r[f.key])
            .map((f) => (
              <label key={f.key}>
                {f.label}
                <button
                  className="shipzy-field-link"
                  onClick={() => {
                    const linked = data.records.find(
                      (x: any) => x.id === r[f.key],
                    );
                    if (linked) go(recordLink(linked));
                  }}
                >
                  {data.records.find((x: any) => x.id === r[f.key])?.name ||
                    data.records.find((x: any) => x.id === r[f.key])
                      ?.reference ||
                    'Linked record'}
                </button>
              </label>
            ))}
          {!displayed.length && <p>No information recorded in this section.</p>}
        </div>
      )}
      {tab === 'Product Details' && (
        <div className="shipzy-table-scroll">
          <table>
            <thead>
              <tr>
                <th>SR NO</th>
                <th>PRODUCT / DESCRIPTION</th>
                <th>SERIAL NO.</th>
                <th>QUANTITY</th>
                <th>UNIT</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {(r.lines || []).map((l: any, i: number) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{l.description || l.productName}</td>
                  <td>{l.serialNumber || l.serialNumbers || '—'}</td>
                  <td>{l.quantity ?? '—'}</td>
                  <td>{l.uom || '—'}</td>
                  <td>
                    {l.total === undefined
                      ? '—'
                      : money(l.total, r.currency || 'INR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(r.lines || []).length && (
            <Blank title="No product lines recorded" />
          )}
        </div>
      )}
      {tab === 'Documents' && m && (
        <div className="shipzy-document-editor">
          <Documents
            entity={r}
            module={m}
            documents={files.filter((f) => f.entityId === id)}
            data={data.records}
            canWrite={canWrite}
            reload={() => setRevision((v) => v + 1)}
          />
        </div>
      )}
      {tab === 'Activity' && (
        <div className="shipzy-audit">
          {(data.timeline || []).map((a: any, i: number) => (
            <article key={a.id || i}>
              <i />
              <div>
                <strong>
                  {a.event ||
                    a.action ||
                    a.title ||
                    a.label ||
                    'Record activity'}
                </strong>
                <p>{a.reference || a.name || a.description || ''}</p>
                <small>{a.date || a.created}</small>
              </div>
            </article>
          ))}
          {!data.timeline?.length && <Blank title="No recorded activity" />}
          <details>
            <summary>Audit history</summary>
            {data.audit.map((a: any) => (
              <p key={a.id}>
                {a.action} · {a.actor || 'System'} · {a.created}
              </p>
            ))}
          </details>
        </div>
      )}
      <footer>
        <span>
          {locked
            ? 'Historical record · original source preserved'
            : r.status || 'Draft'}
        </span>
        <span>Version {r.version || 1}</span>
      </footer>
      <Dialog open={!!action} onOpenChange={(v) => !v && setAction('')}>
        <DialogContent>
          <DialogTitle>
            {action === 'convert' ? 'Create next document' : 'Change status'}
          </DialogTitle>
          <DialogDescription>
            {entityLabel(r)} · This action is recorded in the audit history.
          </DialogDescription>
          <label>
            {action === 'convert' ? 'Document type' : 'Status'}
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Select…</option>
              {(action === 'convert' ? m?.convert || [] : transitions).map(
                (t) => (
                  <option key={t} value={t}>
                    {opMap[t]?.label || t}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            Reason
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && <p className="error-box">{error}</p>}
          <Button
            disabled={busy || !target || !reason.trim()}
            onClick={perform}
          >
            {busy ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function ShipzyMasters({
  role,
  go,
  logistics = false,
}: {
  role: string;
  go: any;
  logistics?: boolean;
}) {
  const [q, setQ] = useState('');
  const all = masterCategories.flatMap((c) => c.items);
  const groups = [
    [
      'Company & Document Setup',
      ['company-information', 'company-addresses', 'currency'],
    ],
    [
      'Product & Packaging',
      [
        'products',
        'units',
        'packages',
        'package-types',
        'packaging-materials',
        'quality-specifications',
      ],
    ],
    [
      'Trade & Partners',
      ['customers', 'vendors', 'ports', 'bank-details', 'delivery-addresses'],
    ],
    [
      'Terms & Templates',
      [
        'payment-terms',
        'shipment-terms',
        'document-templates',
        'email-templates',
      ],
    ],
    ['Operations & Expenses', ['expense-types', 'order-status']],
    ['Licenses & Compliance', ['advance-licence', 'epcg-licence', 'lc-master']],
    [
      'Logistics',
      [
        'shipping-lines',
        'shipping-line-charges',
        'destination-charges',
        'additional-charges',
      ],
    ],
  ] as [string, string[]][];
  return (
    <>
      <div className="shipzy-catalog-search">
        <Input
          aria-label="Search settings"
          placeholder="Search master settings…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="shipzy-master-grid">
        {groups
          .filter(([title]) => !logistics || title === 'Logistics')
          .map(([title, keys]) => {
            const items = keys
              .map(
                (k) =>
                  all.find((i) => i.key === k) || {
                    key: k,
                    label: opMap[k]?.label || label(k),
                    route: k,
                    roles: opMap[k]?.roles || [],
                  },
              )
              .filter(
                (i) =>
                  i.roles.includes(role) &&
                  (i.label + ' ' + title)
                    .toLowerCase()
                    .includes(q.toLowerCase()),
              );
            return items.length ? (
              <section key={title}>
                <h2>{title}</h2>
                {items.map((i) => (
                  <button key={i.key} onClick={() => go(i.route)}>
                    <FileText size={18} />
                    <span>{i.label}</span>
                  </button>
                ))}
              </section>
            ) : null;
          })}
        {!logistics && (
          <section>
            <h2>User Management</h2>
            {[
              ['users', 'Users'],
              ['administration-permissions', 'User Roles'],
              ['profile', 'My Profile'],
              ['settings', 'Settings'],
              ['workbook-data', 'Import Data'],
              ['all-tools', 'Additional Modules'],
            ]
              .filter(
                ([r, l]) =>
                  canOpenWorkspace(r, role) &&
                  (l + ' User Management')
                    .toLowerCase()
                    .includes(q.toLowerCase()),
              )
              .map(([r, l]) => (
                <button key={r} onClick={() => go(r)}>
                  <UserRound size={18} />
                  <span>{l}</span>
                </button>
              ))}
          </section>
        )}
      </div>
    </>
  );
}
function ShipzyDrive({
  records,
  fy,
  go,
  route,
}: {
  records: any[];
  fy: string;
  go: any;
  route: string;
}) {
  const [tab, setTab] = useState('Invoices'),
    [q, setQ] = useState(''),
    [page, setPage] = useState(0);
  const rows = records.filter(
    (r) =>
      r.fy === fy &&
      r.kind === (tab === 'Proforma Invoice' ? 'proformas' : 'invoices') &&
      JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
  );
  useEffect(() => setPage(0), [tab, q]);
  return (
    <section className="shipzy-panel">
      <nav className="shipzy-tabs">
        {['Invoices', 'Proforma Invoice'].map((t) => (
          <button
            className={tab === t ? 'active' : ''}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="shipzy-table-toolbar">
        <span>
          {route === 'pre-shipment'
            ? 'Pre-Shipment Documents'
            : route === 'post-shipment'
              ? 'Post-Shipment Documents'
              : route === 'packing-drive'
                ? 'Packing Lists'
                : 'Document Repository'}
        </span>
        <label>
          Search:{' '}
          <Input
            value={q}
            aria-label="Search folders"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <div className="shipzy-table-scroll">
        <table>
          <thead>
            <tr>
              <th>ACTION</th>
              <th>INVOICE NO.</th>
              <th>CUSTOMER</th>
              <th>DATE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 10, page * 10 + 10).map((r) => (
              <tr key={r.id}>
                <td>
                  <Button
                    className="shipzy-action"
                    onClick={() => go(recordLink(r, 'Documents'))}
                  >
                    Open Drive <ChevronRight size={14} />
                  </Button>
                </td>
                <td>
                  <button
                    className="shipzy-folder-link"
                    onClick={() => go(recordLink(r, 'Documents'))}
                  >
                    <Folder size={20} />
                    {entityLabel(r)}
                  </button>
                </td>
                <td>
                  {r.customerName ||
                    records.find((p) => p.id === r.partnerId)?.name ||
                    '—'}
                </td>
                <td>{r.date}</td>
                <td>{r.sourceStatus || r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <Blank
          title="No folders found"
          detail="Create an invoice or select another financial year."
        />
      )}
      <footer>
        <span>{rows.length} entries</span>
        <div>
          <Button
            variant="outline"
            disabled={!page}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={(page + 1) * 10 >= rows.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </footer>
    </section>
  );
}
function ShipzyReports({ go, role }: { go: any; role: string }) {
  const [q, setQ] = useState('');
  return (
    <>
      <div className="shipzy-catalog-search">
        <Input
          placeholder="Search reports…"
          aria-label="Search reports"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="shipzy-report-grid">
        {Object.entries(reportRoutes)
          .filter(
            ([r, c]) =>
              canOpenWorkspace(r, role) &&
              c.mode !== 'documents' &&
              c.title.toLowerCase().includes(q.toLowerCase()),
          )
          .map(([r, c]) => (
            <button key={r} onClick={() => go(r)}>
              <FileText size={22} />
              <strong>{c.title}</strong>
              <ChevronRight size={17} />
            </button>
          ))}
      </div>
    </>
  );
}
function ShipzyChecklist({ fy, go }: { fy: string; go: any }) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    api('relationships/workspace?view=All%20data&fy=' + encodeURIComponent(fy))
      .then((r) => setRows(r.filter((x: any) => x.kind === 'invoices')))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [fy]);
  if (busy) return <Loading />;
  if (error) return <div className="error-box">{error}</div>;
  const labels = [
    'Invoice',
    'Shipping bill',
    'Bill of lading',
    'Packing list',
    'Customer receipt',
    'Bank realisation',
    'eBRC',
  ];
  return (
    <section className="shipzy-panel">
      <div className="shipzy-table-scroll">
        <table>
          <thead>
            <tr>
              <th>INVOICE</th>
              <th>CUSTOMER</th>
              {labels.map((l) => (
                <th key={l}>{l.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <button
                    className="shipzy-link"
                    onClick={() =>
                      go('invoices?record=' + encodeURIComponent(r.id))
                    }
                  >
                    {r.reference}
                  </button>
                </td>
                <td>{r.party}</td>
                {labels.map((l) => {
                  const c = r.stages
                    .flatMap((s: any) => s.checks)
                    .find((c: any) => c.key === l);
                  return (
                    <td key={l}>
                      <button
                        aria-label={
                          l + ': ' + (c?.complete ? 'Recorded' : 'Pending')
                        }
                        title={c?.complete ? 'Recorded' : 'Pending'}
                        onClick={() =>
                          go(
                            'invoices?record=' +
                              encodeURIComponent(r.id) +
                              '&tab=Documents',
                          )
                        }
                        className={
                          c?.complete
                            ? 'shipzy-check-done'
                            : 'shipzy-check-pending'
                        }
                      >
                        {c?.complete ? '✓' : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <Blank title="No invoices in this financial year" />}
    </section>
  );
}
function ShipzyPayments({
  records,
  fy,
  go,
  payable = false,
}: {
  records: any[];
  fy: string;
  go: any;
  payable?: boolean;
}) {
  const [tab, setTab] = useState('All'),
    [currency, setCurrency] = useState(payable ? 'INR' : 'USD'),
    [q, setQ] = useState(''),
    [page, setPage] = useState(0);
  useEffect(() => setPage(0), [tab, currency, q, fy]);
  const status = (r: any) =>
    r.balance <= 0 ? 'Paid' : r.settled > 0 ? 'Partially Paid' : 'Unpaid';
  const rows = financial360(records, fy).lines.filter(
    (r) =>
      r.fy === fy &&
      r.type === (payable ? 'Payable' : 'Receivable') &&
      r.currency === currency &&
      (tab === 'All' || status(r) === tab) &&
      JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
  );
  const advances = records.filter(
    (r) =>
      r.kind === (payable ? 'supplier-advances' : 'customer-advances') &&
      r.fy === fy &&
      !inactive(r) &&
      r.currency === currency &&
      JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
  );
  const shown = tab === 'Advance Payment' ? advances : rows;
  return (
    <section className="shipzy-panel">
      <nav className="shipzy-tabs">
        {['All', 'Partially Paid', 'Unpaid', 'Paid', 'Advance Payment'].map(
          (t) => (
            <button
              key={t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
      </nav>
      <div className="shipzy-table-toolbar">
        <label>
          Currency{' '}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {[
              ...new Set([
                'INR',
                'USD',
                ...records.map((r) => r.currency).filter(Boolean),
              ]),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div>
          <label>
            Search: <Input value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Button
            onClick={() =>
              go((payable ? 'payments' : 'receipts') + '?create=1')
            }
          >
            Add Payment
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportCSV(
                shown.map((r) => ({
                  reference: entityLabel(r),
                  currency,
                  amount: r.amount / 100,
                  received: r.settled === undefined ? '' : r.settled / 100,
                  balance: r.balance === undefined ? '' : r.balance / 100,
                })),
                'Payments',
              )
            }
          >
            Export
          </Button>
        </div>
      </div>
      <div className="shipzy-table-scroll">
        <table>
          <thead>
            <tr>
              <th>ACTION</th>
              <th>INVOICE NO.</th>
              <th>{payable ? 'SUPPLIER' : 'CUSTOMER'}</th>
              <th>INVOICE AMOUNT</th>
              <th>PAYMENT {payable ? 'PAID' : 'RECEIVED'}</th>
              <th>BALANCE DUE</th>
              <th>STATUS</th>
              <th>DATE</th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(page * 10, page * 10 + 10).map((r) => {
              const invoice = records.find((x) => x.id === r.id) || r;
              return (
                <tr key={r.id}>
                  <td>
                    <Button
                      className="shipzy-action"
                      onClick={() =>
                        go(recordLink(invoice, 'Commercial Details'))
                      }
                    >
                      Action <ChevronRight size={13} />
                    </Button>
                  </td>
                  <td>
                    <button onClick={() => go(recordLink(invoice))}>
                      {entityLabel(r)}
                    </button>
                  </td>
                  <td>
                    {records.find((p) => p.id === invoice.partnerId)?.name ||
                      invoice.customerName ||
                      '—'}
                  </td>
                  <td>{money(r.amount, currency)}</td>
                  <td>
                    {r.settled === undefined ? '—' : money(r.settled, currency)}
                  </td>
                  <td>
                    {r.balance === undefined ? '—' : money(r.balance, currency)}
                  </td>
                  <td>
                    <span className="shipzy-status">
                      {tab === 'Advance Payment' ? r.status : status(r)}
                    </span>
                  </td>
                  <td>{r.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!shown.length && <Blank title="No matching payments" />}
      <footer>
        <span>
          {shown.length} entries · {currency}
        </span>
        <div>
          <Button
            variant="outline"
            disabled={!page}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={(page + 1) * 10 >= shown.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </footer>
    </section>
  );
}
