'use client';
import { useEffect, useState } from 'react';
import {
  Plus,
  Download,
  Search,
  ArrowUpRight,
  Save,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  api,
  Field,
  Pick,
  Blank,
  Status,
  money,
  dateLabel,
  today,
  exportCSV,
} from './erp-ui';
import { accountNames, masterKinds, moneyMinor, ageing } from '@/lib/domain';
import type { RecordData } from '@/lib/domain';
import { titles, routeKind } from '@/lib/navigation';
import { toast } from '@/lib/toast';
export function RecordForm({
  kind,
  records,
  onDone,
  onClose,
}: {
  kind: string;
  records: RecordData[];
  onDone: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<any>({
      date: today(),
      currency: 'INR',
      country: 'India',
      direction: 'Receipt',
      severity: 'Warning',
      category: kind === 'documents' ? 'Export document' : 'LEO',
      dueDate: today(),
      unit: 'PCS',
      totalStages: '1',
      role: 'Viewer',
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const change = (key: string, v: any) =>
    setForm((f: any) => ({ ...f, [key]: v }));
  const field = (
    key: string,
    label: string,
    type = 'text',
    required = true,
  ) => (
    <Field
      key={key}
      label={label}
      value={form[key]}
      type={type}
      required={required}
      onChange={(v) => change(key, v)}
    />
  );
  const pick = (key: string, label: string, options: any[]) => (
    <label className="field" key={key}>
      <span>{label} *</span>
      <Pick
        value={form[key] || ''}
        onChange={(v) => change(key, v)}
        label={label}
        options={options}
      />
    </label>
  );
  const recordsOf = (k: string) =>
    records
      .filter((r) => r.kind === k)
      .map((r) => ({ value: r.id, label: r.name }));
  const commercial = [
    'orders',
    'purchase-orders',
    'invoices',
    'bills',
  ].includes(kind);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="record-dialog">
        <DialogTitle>
          {kind === 'users' ? 'Add user' : `New ${titles[kind] || kind}`}
        </DialogTitle>
        <DialogDescription>
          {kind === 'invoices'
            ? 'Save a draft, review it, then post to the ledger.'
            : kind === 'bills'
              ? 'Expense bills post to operating expenses. Stock acquisition matching is a later workflow.'
              : kind === 'movements'
                ? 'Records physical stock only. Post inventory valuation separately in the general ledger.'
                : 'Complete the details below. Required fields are marked.'}
        </DialogDescription>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              let payload = { ...form };
              if (kind === 'journal') {
                const amount = moneyMinor(form.amount);
                payload.lines = [
                  { account: form.debit, debit: amount, credit: 0 },
                  { account: form.credit, debit: 0, credit: amount },
                ];
              }
              await api(
                kind === 'users' ? 'users' : 'records/' + kind,
                payload,
              );
              toast.success('Record saved');
              onDone();
              onClose();
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            {kind === 'users' ? (
              <>
                {field('name', 'Full name')}
                {field('email', 'Email address', 'email')}
                {field(
                  'password',
                  'Initial password (12+ characters)',
                  'password',
                )}
                {pick('role', 'Role', [
                  'Admin',
                  'Finance',
                  'Logistics',
                  'Viewer',
                ])}
              </>
            ) : (
              <>
                {masterKinds.includes(kind) ? (
                  <>
                    {field('name', 'Name')}
                    {['customers', 'vendors'].includes(kind) && (
                      <>
                        {field('email', 'Email address', 'email', false)}
                        {field('country', 'Country')}
                      </>
                    )}
                    {kind === 'products' && (
                      <>
                        {field('sku', 'SKU')}
                        {field('unit', 'Unit')}
                        {field(
                          'reorderPoint',
                          'Reorder point',
                          'number',
                          false,
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {field('reference', 'Reference')}
                    {field('date', 'Document date', 'date')}
                    {commercial && (
                      <>
                        {pick(
                          'partnerId',
                          ['bills', 'purchase-orders'].includes(kind)
                            ? 'Vendor'
                            : 'Customer',
                          recordsOf(
                            ['bills', 'purchase-orders'].includes(kind)
                              ? 'vendors'
                              : 'customers',
                          ),
                        )}
                        {field('amount', 'Amount', 'number')}
                        {pick('currency', 'Currency', [
                          'INR',
                          'USD',
                          'EUR',
                          'GBP',
                          'AED',
                        ])}
                        {field('dueDate', 'Due date', 'date')}
                      </>
                    )}
                    {kind === 'orders' && (
                      <>
                        {field('destination', 'Destination')}
                        {field(
                          'totalStages',
                          'Number of workflow stages',
                          'number',
                        )}
                        {field('etd', 'Estimated departure', 'date', false)}
                        {field('eta', 'Estimated arrival', 'date', false)}
                      </>
                    )}
                    {kind === 'journal' && (
                      <>
                        {field('memo', 'Description')}
                        {field('amount', 'Amount', 'number')}
                        {pick('currency', 'Currency', [
                          'INR',
                          'USD',
                          'EUR',
                          'GBP',
                          'AED',
                        ])}
                        {pick(
                          'debit',
                          'Debit account',
                          Object.entries(accountNames).map(
                            ([value, label]) => ({
                              value,
                              label: value + ' · ' + label,
                            }),
                          ),
                        )}
                        {pick(
                          'credit',
                          'Credit account',
                          Object.entries(accountNames).map(
                            ([value, label]) => ({
                              value,
                              label: value + ' · ' + label,
                            }),
                          ),
                        )}
                      </>
                    )}
                    {kind === 'movements' && (
                      <>
                        {pick('productId', 'Product', recordsOf('products'))}
                        {pick(
                          'warehouseId',
                          'Warehouse',
                          recordsOf('warehouses'),
                        )}
                        {pick('direction', 'Movement', ['Receipt', 'Issue'])}
                        {field('quantity', 'Quantity (whole units)', 'number')}
                        {field('reason', 'Reason')}
                      </>
                    )}
                    {['exceptions', 'tasks', 'documents'].includes(kind) &&
                      field(
                        'name',
                        kind === 'tasks'
                          ? 'Task title'
                          : kind === 'exceptions'
                            ? 'Exception title'
                            : 'Document title',
                      )}
                    {['exceptions', 'tasks'].includes(kind) && (
                      <>
                        {field('dueDate', 'Due date', 'date')}
                        {field('notes', 'Notes', 'text', false)}
                      </>
                    )}
                    {kind === 'exceptions' && (
                      <>
                        {pick('category', 'Category', [
                          'LEO',
                          'LUT',
                          'FEMA',
                          'eBRC pending',
                          'eBRC mismatch',
                          'E-Way Bill',
                          'Payment overdue',
                          'Other',
                        ])}
                        {pick('severity', 'Severity', [
                          'Critical',
                          'Warning',
                          'Attention',
                        ])}
                      </>
                    )}
                    {kind === 'documents' && (
                      <>
                        {pick('category', 'Category', [
                          'Export document',
                          'Domestic document',
                          'Invoice',
                          'Shipping Bill',
                          'Bill of Lading',
                          'Other',
                        ])}
                        {field('url', 'Document link', 'url')}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <div className="form-footer">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Save size={16} />
              {busy
                ? 'Saving…'
                : kind === 'journal'
                  ? 'Post journal'
                  : 'Save record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default function Register({
  route,
  records,
  filter,
  refresh,
  canWrite,
  fy,
}: {
  route: string;
  records: RecordData[];
  filter: string;
  refresh: () => void;
  canWrite: boolean;
  fy: string;
}) {
  const kind = routeKind(route),
    [search, setSearch] = useState(filter),
    [status, setStatus] = useState('All'),
    [create, setCreate] = useState(false),
    [selected, setSelected] = useState<RecordData | null>(null),
    [nextStatus, setNextStatus] = useState(''),
    [stage, setStage] = useState(''),
    [stageName, setStageName] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setSearch(filter);
    setStatus('All');
    setSelected(null);
  }, [route, filter]);
  const scope = new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.search,
  );
  const from = scope.get('from'),
    to = scope.get('to');
  const source = records.filter(
    (r) =>
      r.kind === kind &&
      (masterKinds.includes(kind) ||
        (to && ['receivables', 'payables'].includes(route)) ||
        r.fy === fy) &&
      (!to || !r.date || r.date <= to) &&
      (!from || !r.date || r.date >= from),
  );
  const dueBucket = (r: RecordData) =>
    r.dueDate ? ageing(r.dueDate, to || today()) : '';
  const rows = source.filter((r) => {
    if (
      ['receivables', 'payables', 'sales-report'].includes(route) &&
      r.status !== 'Posted'
    )
      return false;
    return (
      (status === 'All' || r.status === status) &&
      (search === 'Active'
        ? !['Completed', 'Cancelled'].includes(r.status)
        : [
            r.reference,
            r.name,
            r.sku,
            r.currency,
            r.destination,
            records.find((x) => x.id === r.partnerId)?.name,
            r.status,
            dueBucket(r),
          ].some((x) =>
            String(x || '')
              .toLowerCase()
              .includes(search.toLowerCase()),
          ))
    );
  });
  const partner = (r: RecordData) =>
    records.find((x) => x.id === r.partnerId)?.name || '—';
  const columns = masterKinds.includes(kind)
    ? ['Name', kind === 'products' ? 'SKU' : 'Email / detail', 'Created']
    : kind === 'movements'
      ? ['Reference', 'Product', 'Warehouse', 'Movement', 'Quantity', 'Date']
      : kind === 'journal'
        ? ['Reference', 'Description', 'Debit', 'Credit', 'Currency', 'Date']
        : ['exceptions', 'tasks', 'documents'].includes(kind)
          ? [
              'Reference',
              'Title',
              'Category',
              'Status',
              kind === 'documents' ? 'Date' : 'Due date',
            ]
          : ['Reference', 'Partner', 'Amount', 'Status', 'Date'];
  const statusOptions: Record<string, string[]> = {
    orders: [
      'Draft',
      'Confirmed',
      'In Transit',
      'Delayed',
      'Pending Action',
      'Completed',
      'Cancelled',
    ],
    'purchase-orders': ['Draft', 'Confirmed', 'Received', 'Cancelled'],
    exceptions: ['Open', 'Resolved'],
    tasks: ['Open', 'In Progress', 'Completed'],
  };
  const amounts = (r: RecordData) =>
    r.lines?.reduce((s: number, l: any) => s + l.debit, 0) || 0;
  return (
    <>
      <div className="register-summary">
        <span>
          {source.length} {source.length === 1 ? 'record' : 'records'}{' '}
          <span className="muted">· FY {fy}</span>
        </span>
        <div className="inline-actions">
          <Button
            variant="outline"
            disabled={!rows.length}
            onClick={() =>
              exportCSV(
                rows.map((r) => ({
                  ...r,
                  partner: partner(r),
                  amount: r.amount !== undefined ? r.amount / 100 : undefined,
                })),
                route + '-' + fy,
              )
            }
          >
            <Download size={16} />
            Export CSV
          </Button>
          {canWrite &&
            !['receivables', 'payables', 'sales-report'].includes(route) && (
              <Button onClick={() => setCreate(true)}>
                <Plus size={17} />
                Add{' '}
                {kind === 'journal'
                  ? 'journal'
                  : masterKinds.includes(kind)
                    ? 'record'
                    : kind === 'movements'
                      ? 'movement'
                      : 'record'}
              </Button>
            )}
        </div>
      </div>
      {['exceptions', 'documents'].includes(kind) && (
        <p className="note">
          {kind === 'exceptions'
            ? 'Exceptions are recorded manually. Statutory deadlines and government portal checks are not yet automated.'
            : 'Document Centre stores links to your documents. File storage and document generation are planned.'}
        </p>
      )}
      <section className="widget register-widget">
        <div className="register-toolbar">
          <div className="search-field">
            <Search size={17} />
            <Input
              aria-label="Search records"
              placeholder="Search this register…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!masterKinds.includes(kind) && (
            <Pick
              value={status}
              onChange={setStatus}
              label="Filter by status"
              options={[
                'All',
                ...new Set(source.map((r) => r.status).filter(Boolean)),
              ]}
            />
          )}
        </div>
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
                <TableHead>
                  <span className="sr-only">Details</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => {
                    setSelected(r);
                    setNextStatus(r.status);
                    setStage(String(r.stage || 1));
                    setStageName(r.stageName || '');
                  }}
                >
                  {masterKinds.includes(kind) ? (
                    <>
                      <TableCell className="strong">{r.name}</TableCell>
                      <TableCell>
                        {r.sku || r.email || r.country || r.unit || '—'}
                      </TableCell>
                      <TableCell>{dateLabel(r.created)}</TableCell>
                    </>
                  ) : kind === 'movements' ? (
                    <>
                      <TableCell className="strong">{r.reference}</TableCell>
                      <TableCell>
                        {records.find((p) => p.id === r.productId)?.name}
                      </TableCell>
                      <TableCell>
                        {records.find((p) => p.id === r.warehouseId)?.name}
                      </TableCell>
                      <TableCell>
                        <Status value={r.direction} />
                      </TableCell>
                      <TableCell>
                        {r.direction === 'Issue' ? '-' : '+'}
                        {r.quantity}
                      </TableCell>
                      <TableCell>{dateLabel(r.date)}</TableCell>
                    </>
                  ) : kind === 'journal' ? (
                    <>
                      <TableCell className="strong">{r.reference}</TableCell>
                      <TableCell>{r.memo}</TableCell>
                      <TableCell>{money(amounts(r), r.currency)}</TableCell>
                      <TableCell>{money(amounts(r), r.currency)}</TableCell>
                      <TableCell>{r.currency}</TableCell>
                      <TableCell>{dateLabel(r.date)}</TableCell>
                    </>
                  ) : ['exceptions', 'tasks', 'documents'].includes(kind) ? (
                    <>
                      <TableCell className="strong">{r.reference}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.category || 'Task'}</TableCell>
                      <TableCell>
                        <Status value={r.status} />
                      </TableCell>
                      <TableCell>{dateLabel(r.dueDate || r.date)}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="strong">{r.reference}</TableCell>
                      <TableCell>{partner(r)}</TableCell>
                      <TableCell className="amount">
                        {money(r.amount, r.currency)}
                      </TableCell>
                      <TableCell>
                        <Status value={r.status} />
                      </TableCell>
                      <TableCell>{dateLabel(r.date)}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <button
                      className="icon-btn"
                      aria-label={`Open ${r.reference || r.name}`}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Blank
            title={
              search || status !== 'All'
                ? 'No matching records'
                : 'Your register is ready'
            }
            detail={
              search || status !== 'All'
                ? 'Try changing the search or status filter.'
                : `Add your first record to begin. ${['orders', 'invoices', 'bills', 'purchase-orders'].includes(kind) ? 'Create the customer or vendor in Masters first.' : ''}`
            }
          />
        )}
        <div className="widget-foot">
          {rows.length} of {source.length} records · Amounts in original
          currency
        </div>
      </section>
      {create && (
        <RecordForm
          kind={kind}
          records={records}
          onDone={refresh}
          onClose={() => setCreate(false)}
        />
      )}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="detail-sheet">
          <SheetHeader>
            <SheetTitle>{selected?.reference || selected?.name}</SheetTitle>
            <SheetDescription>{titles[kind]} · Record details</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="detail-body">
              {selected.status && <Status value={selected.status} />}
              <dl>
                {Object.entries(selected)
                  .filter(
                    ([k, v]) =>
                      ![
                        'id',
                        'kind',
                        'fy',
                        'version',
                        'created',
                        'lines',
                      ].includes(k) &&
                      v !== '' &&
                      v !== null,
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd>
                        {key === 'amount' ? (
                          money(value as number, selected.currency)
                        ) : key.endsWith('Id') ? (
                          records.find((r) => r.id === value)?.name || '—'
                        ) : key === 'url' ? (
                          <a
                            href={String(value)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-link"
                          >
                            Open document <ExternalLink size={15} />
                          </a>
                        ) : (
                          String(value)
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
              {selected.lines && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.lines.map((l: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{accountNames[l.account]}</TableCell>
                        <TableCell>
                          {money(l.debit, selected.currency)}
                        </TableCell>
                        <TableCell>
                          {money(l.credit, selected.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <p className="muted">
                Created {new Date(selected.created).toLocaleString('en-IN')} ·
                Revision {selected.version}
              </p>
              {canWrite &&
                ['invoices', 'bills'].includes(kind) &&
                selected.status === 'Draft' && (
                  <div className="posting-panel">
                    <p>
                      Posting creates a balanced journal entry. Posted financial
                      documents cannot be edited.
                    </p>
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api(`records/${kind}/${selected.id}/post`, {});
                          toast.success('Document posted to the ledger');
                          setSelected(null);
                          refresh();
                        } catch (e: any) {
                          toast.error(e.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {busy ? 'Posting…' : 'Post to ledger'}
                    </Button>
                  </div>
                )}
              {canWrite && statusOptions[kind] && (
                <form
                  className="status-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                      await api(`records/${kind}/${selected.id}/status`, {
                        status: nextStatus,
                        stage,
                        stageName,
                        version: selected.version,
                      });
                      toast.success('Status updated');
                      setSelected(null);
                      refresh();
                    } catch (e: any) {
                      toast.error(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <h3>Update progress</h3>
                  <Pick
                    label="Status"
                    value={nextStatus}
                    onChange={setNextStatus}
                    options={statusOptions[kind]}
                  />
                  {kind === 'orders' && (
                    <>
                      <Field
                        label="Current stage"
                        value={stage}
                        onChange={setStage}
                        type="number"
                      />
                      <Field
                        label="Stage description"
                        value={stageName}
                        onChange={setStageName}
                      />
                    </>
                  )}
                  <Button disabled={busy} type="submit">
                    Save progress
                  </Button>
                </form>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
