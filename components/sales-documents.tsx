'use client';
import { Record360 } from './record-360';
import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  ArrowLeft,
  ChevronRight,
  MoreHorizontal,
  LockKeyhole,
  Trash2,
  Printer,
  Download,
  Search,
  AlertCircle,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { api, Loading, Blank, Status, money, today, exportCSV } from './erp-ui';
import { Documents } from './operations';
import { opMap } from '@/lib/operations';
import {
  salesTabs,
  salesLabels,
  priceSales,
  salesIssues,
  quoteStates,
} from '@/lib/sales-engine';
const freshLine = () => ({
  productId: '',
  description: '',
  quantity: '1',
  rate: '',
  uom: '',
  hsn: '',
  discountPercent: '0',
  taxCodeId: '',
  gstRate: '0',
  tcsRate: '0',
  tdsRate: '0',
  serialNumbers: '',
  overrideEnabled: false,
  overrideReason: '',
});
const afterDays = (date: string, days: number) => {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const costFields = [
  ['product', 'Product cost'],
  ['freight', 'Freight cost'],
  ['insurance', 'Insurance cost'],
  ['handling', 'Loading / unloading'],
  ['customs', 'Customs / duties'],
  ['other', 'Other cost'],
];
function Choice({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  options: any[];
  required?: boolean;
}) {
  const [search, setSearch] = useState('');
  return (
    <label className="field">
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      {options.length > 12 && (
        <Input
          aria-label={'Search ' + label}
          placeholder="Search options…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select {label.toLowerCase()}</option>
        {options
          .map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
          .filter(
            (o) =>
              o.value === value ||
              o.label.toLowerCase().includes(search.toLowerCase()),
          )
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
    </label>
  );
}
function ValueField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      {type === 'textarea' ? (
        <textarea
          rows={4}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          type={type}
          step={type === 'number' ? 'any' : undefined}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function PricingSummary({ d }: { d: any }) {
  let t: any = {};
  let error = '';
  try {
    t = priceSales({ ...d, lines: d.lines || [] }).totals;
  } catch (e: any) {
    error = e.message;
  }
  return (
    <aside className="sales-summary">
      <span className="sales-eyebrow">DOCUMENT SUMMARY</span>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          {[
            ['subtotal', 'Subtotal'],
            ['discount', 'Discount'],
            ['taxable', 'Taxable value'],
            ['cgst', 'CGST'],
            ['sgst', 'SGST'],
            ['igst', 'IGST'],
            ['tcs', 'TCS'],
            ['tds', 'TDS'],
            ['charges', 'Additional charges'],
            ['rounding', 'Round off'],
          ].map(([key, label]) => (
            <div key={key}>
              <span>{label}</span>
              <strong>{money(t[key] || 0, d.currency || 'INR')}</strong>
            </div>
          ))}
          <footer>
            <span>Grand total</span>
            <strong>{money(t.total || 0, d.currency || 'INR')}</strong>
          </footer>
        </>
      )}
    </aside>
  );
}
export default function SalesDocuments({
  kind,
  user,
  fy,
  go,
  initialId,
  refreshParent,
}: {
  kind: string;
  user: any;
  fy: string;
  go: (r: string) => void;
  initialId?: string;
  refreshParent: () => void;
}) {
  const [records, setRecords] = useState<any[]>([]),
    [data, setData] = useState<any[]>([]),
    [users, setUsers] = useState<any[]>([]),
    [selected, setSelected] = useState(initialId || ''),
    [detail, setDetail] = useState<any>(null),
    [editing, setEditing] = useState(false),
    [manage, setManage] = useState(false),
    [draft, setDraft] = useState<any>({ lines: [] }),
    [tab, setTab] = useState('Overview'),
    [filter, setFilter] = useState('All'),
    [query, setQuery] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [issues, setIssues] = useState<any[]>([]),
    [item, setItem] = useState<any>(null),
    [itemIndex, setItemIndex] = useState(-1),
    [advanced, setAdvanced] = useState(false),
    [pending, setPending] = useState<any>(null),
    [reason, setReason] = useState(''),
    [channel, setChannel] = useState('Email'),
    [saved, setSaved] = useState(''),
    [recovering, setRecovering] = useState(false),
    [recovery, setRecovery] = useState<any>(null),
    [page, setPage] = useState(0),
    [docs, setDocs] = useState<any[]>([]);
  useEffect(() => {
    setManage(
      new URLSearchParams(window.location.search).get('actions') === '1',
    );
  }, [selected]);
  const canWrite = ['Admin', 'Finance'].includes(user.role),
    title = salesLabels[kind] || 'Document';
  const draftKey = kind + '-' + (selected || 'new');
  const queue = useRef(Promise.resolve());
  const formRef = useRef<any>(draft);
  useEffect(() => {
    formRef.current = draft;
  }, [draft]);
  const reload = () => {
    setRevision((n) => n + 1);
    refreshParent();
  };
  useEffect(() => {
    setSelected(initialId || '');
    setEditing(false);
    setDetail(null);
    setTab('Overview');
  }, [kind, initialId]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    Promise.all([
      api('sales/' + kind),
      api('operations/data'),
      api('sales/lookups'),
    ])
      .then(([r, d, l]) => {
        if (live) {
          setRecords(r);
          setData(d);
          setUsers(l.users);
        }
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [kind, revision]);
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let live = true;
    Promise.all([api(`sales/${kind}/${selected}`), api('operations/documents')])
      .then(([d, f]) => {
        if (live) {
          setDetail(d);
          setDocs(f.filter((r: any) => r.entityId === selected));
        }
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [selected, kind, revision]);
  useEffect(() => {
    if (!editing || !canWrite || recovering || recovery || busy) return;
    setSaved('Unsaved changes');
    const snapshot = draft,
      key = draftKey;
    const timer = setTimeout(() => {
      setSaved('Saving draft protection…');
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          try {
            await api('sales/draft/' + key, { payload: snapshot });
            if (formRef.current === snapshot)
              setSaved('Draft protected · saved just now');
          } catch (e: any) {
            setSaved('Draft protection failed');
            setError(e.message);
          }
        });
    }, 1200);
    return () => clearTimeout(timer);
  }, [draft, editing, draftKey, canWrite, recovering, recovery, busy]);
  useEffect(() => {
    if (!editing) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (saved !== 'Draft protected · saved just now') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editing, saved]);
  const options = (k: string) =>
    data
      .filter(
        (r) =>
          r.kind === k &&
          !['Inactive', 'Blocked', 'Cancelled'].includes(r.status),
      )
      .map((r) => ({ value: r.id, label: r.name || r.reference }));
  const set = (key: string, value: any) =>
    setDraft((d: any) => ({ ...d, [key]: value }));
  const field = (
    key: string,
    label: string,
    type = 'text',
    required = false,
  ) => (
    <ValueField
      label={label}
      value={draft[key]}
      type={type}
      required={required}
      onChange={(v) => set(key, v)}
    />
  );
  const choice = (
    key: string,
    label: string,
    opts: any[],
    required = false,
  ) => (
    <Choice
      label={label}
      value={draft[key]}
      onChange={(v) => set(key, v)}
      options={opts}
      required={required}
    />
  );
  const customer = data.find((r) => r.id === draft.partnerId);
  const begin = async (existing?: any) => {
    setRecovering(true);
    setRecovery(null);
    setError('');
    setIssues([]);
    const d: any = existing
      ? {
          ...existing,
          internalNotes: detail?.internal?.notes || '',
          internalCosting: detail?.internal?.costing || {},
        }
      : {
          date: today(),
          validUntil: afterDays(today(), 14),
          quotationType: kind === 'domestic-invoices' ? 'Domestic' : 'Domestic',
          salesPersonId: user.id,
          lines: [],
          taxInclusive: false,
          withholdingBase: 'Taxable value',
          gstSplit: 'IGST',
          internalCosting: {},
        };
    if (existing && !existing.salesEngine) {
      d.billingAddress = data.find((r) => r.id === d.partnerId)?.address || '';
      d.shippingAddress = d.billingAddress;
      d.lines = (d.lines || []).map((l: any) => ({ ...freshLine(), ...l }));
    }
    setDraft(d);
    setEditing(true);
    setTab('General');
    setSaved('');
    try {
      const savedDraft = await api(
        'sales/draft/' + kind + '-' + (existing?.id || 'new'),
      );
      setRecovery(savedDraft?.payload ? savedDraft : null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRecovering(false);
    }
  };
  const chooseCustomer = (id: string) => {
    const c = data.find((r) => r.id === id);
    setDraft((d: any) => ({
      ...d,
      partnerId: id,
      contactId: '',
      customerName: c?.name || '',
      customerGstin: c?.gstin || '',
      billingAddress: c?.address || '',
      shippingAddress: c?.shippingAddress || c?.address || '',
      currencyId: c?.currencyId || d.currencyId,
      currency:
        data.find((x) => x.id === (c?.currencyId || d.currencyId))?.code || '',
      paymentTermsId: c?.paymentTermsId || d.paymentTermsId,
      priceListId: c?.priceListId || d.priceListId,
      taxTreatment: c?.taxTreatment || d.taxTreatment,
      creditTerms: c?.creditLimit ? 'Credit limit: ' + c.creditLimit : '',
    }));
  };
  const save = async (submit = false) => {
    setBusy(true);
    setError('');
    try {
      const found = salesIssues(draft);
      if (submit && found.length) {
        setIssues(found);
        return;
      }
      const result = await api(
        `sales/${kind}${selected ? '/' + selected + '/save' : ''}`,
        {
          ...draft,
          version: detail?.record?.version,
          reason: 'Saved by ' + user.name,
        },
      );
      const key = result.id;
      if (submit) {
        const current = await api(`sales/${kind}/${key}`);
        await api(`sales/${kind}/${key}/status`, {
          version: current.record.version,
          status: 'Under Review',
          reason: 'Submitted for review',
        });
      }
      await queue.current;
      await api('sales/draft/' + draftKey, { payload: null });
      setRecovery(null);
      setSelected(key);
      setEditing(false);
      setTab('Overview');
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const act = async () => {
    if (!detail) return;
    setBusy(true);
    setError('');
    try {
      const result = await api(`sales/${kind}/${selected}/${pending.type}`, {
        version: detail.record.version,
        status: pending.status,
        target: pending.target,
        reason,
        channel,
      });
      setPending(null);
      setReason('');
      if (result.kind) {
        go(result.kind + '?record=' + result.id);
      } else if (result.id && result.id !== selected) {
        setSelected(result.id);
        setEditing(false);
        setTab('Overview');
        reload();
      } else reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const record = detail?.record;
  const expired =
    record?.validUntil < today() &&
    ['Approved', 'Sent', 'Viewed'].includes(record?.status);
  const state = expired ? 'Expired' : record?.status || 'Draft';
  const print = () => {
    window.print();
  };
  const email = async () => {
    const c = data.find((r) => r.id === record.partnerId);
    await api(`sales/${kind}/${selected}/communication`, {
      version: record.version,
      type: 'Email draft prepared',
      channel: 'Email',
      reason: 'Prepared locally; delivery not confirmed',
    });
    window.location.href = `mailto:${encodeURIComponent(c?.email || '')}?subject=${encodeURIComponent(title + ' ' + record.reference)}&body=${encodeURIComponent(`Please find ${title.toLowerCase()} ${record.reference}.\n\nTotal: ${record.currency} ${(record.amount / 100).toFixed(2)}\nValid until: ${record.validUntil}\n\nRegards,\nRohit's ERP`)}`;
    reload();
  };
  const rows = records.filter(
    (r) =>
      r.fy === fy &&
      (filter === 'All' ||
        (filter === 'Expiring'
          ? r.validUntil >= today() &&
            r.validUntil <= afterDays(today(), 7) &&
            !['Converted', 'Revised', 'Rejected'].includes(r.status)
          : r.status === filter)) &&
      [
        r.reference,
        r.customerName,
        data.find((x) => x.id === r.partnerId)?.name,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const totalCost = costFields.reduce(
    (n, [k]) => n + (Number(draft.internalCosting?.[k]) || 0),
    0,
  );
  let selling = 0;
  try {
    selling =
      (priceSales({ ...draft, lines: draft.lines || [] }).totals.taxable +
        priceSales({ ...draft, lines: draft.lines || [] }).totals.charges) /
      100;
  } catch {}
  if (!canWrite && user.role !== 'Viewer')
    return <Blank title="Sales access unavailable" />;
  if (record && !editing && !manage)
    return (
      <Record360
        id={record.id}
        go={go}
        back={() => {
          setSelected('');
          setDetail(null);
        }}
        onManage={!record.importLocked ? () => setManage(true) : undefined}
      />
    );

  return (
    <div className="sales-workspace">
      {error && (
        <div role="alert" className="error-box">
          {error}
          <Button variant="outline" onClick={reload}>
            Reload
          </Button>
        </div>
      )}
      {loading && !records.length && !editing && !selected ? (
        <Loading />
      ) : editing ? (
        <>
          <header className="sales-document-header">
            <div>
              <button
                className="text-link"
                onClick={() => setPending({ type: 'close' })}
              >
                <ArrowLeft size={16} /> {title}s
              </button>
              <h2>{draft.reference || 'New ' + title}</h2>
              <span className="sales-meta">
                {draft.reference
                  ? 'Revision ' + (draft.revisionNumber || 1)
                  : 'Number assigned when you save'}{' '}
                · Draft
              </span>
            </div>
            <div className="inline-actions">
              <output className="sales-save-status">{saved}</output>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => save(false)}
              >
                <Save size={16} /> Save Draft
              </Button>
              <Button disabled={busy} onClick={() => save(true)}>
                Submit for Review
              </Button>
            </div>
          </header>
          {recovery && (
            <div className="sales-recovery">
              A protected draft is available from{' '}
              {new Date(recovery.updatedAt).toLocaleString('en-IN')}.
              <Button
                variant="outline"
                onClick={() => {
                  setDraft(recovery.payload);
                  setRecovery(null);
                }}
              >
                Restore draft
              </Button>
              <Button variant="ghost" onClick={() => setRecovery(null)}>
                Keep current form
              </Button>
            </div>
          )}
          {issues.length > 0 && (
            <div className="sales-validation" role="alert">
              <strong>{issues.length} issues need attention</strong>
              {issues.map((issue, i) => (
                <button key={i} onClick={() => setTab(issue.section)}>
                  <AlertCircle size={15} />
                  {issue.message}
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          )}
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
            <TabsList variant="line" className="sales-tabs">
              {salesTabs
                .filter(
                  (t) => t !== 'Internal Costing' || user.role !== 'Viewer',
                )
                .map((t) => (
                  <TabsTrigger key={t} value={t}>
                    {(
                      {
                        General: 'Basics',
                        'Items & Pricing': 'Products',
                        Delivery: 'Shipment',
                        'Terms & Notes': 'Terms',
                        'Internal Costing': 'Costing (optional)',
                      } as Record<string, string>
                    )[t] || t}
                  </TabsTrigger>
                ))}
            </TabsList>
            <div className="sales-editor-layout">
              <main className="widget sales-main-form">
                <TabsContent value="General">
                  <div className="sales-fields">
                    {field('date', title + ' date', 'date', true)}
                    {field('validUntil', 'Valid Until', 'date', true)}
                    {['invoices', 'domestic-invoices'].includes(kind) &&
                      field('dueDate', 'Payment due date', 'date')}
                    {choice(
                      'quotationType',
                      'Document type',
                      ['Domestic', 'Export'],
                      true,
                    )}
                    <Choice
                      label="Customer"
                      value={draft.partnerId}
                      options={options('customers')}
                      onChange={chooseCustomer}
                      required
                    />
                    {choice(
                      'contactId',
                      'Contact person',
                      (customer?.contacts || []).map((c: any, i: number) => ({
                        value: String(i),
                        label: c.name || c.email || 'Contact ' + (i + 1),
                      })),
                    )}
                    {choice(
                      'salesPersonId',
                      'Salesperson',
                      users.map((u) => ({ value: u.id, label: u.name })),
                      true,
                    )}
                    {field('customerReference', 'Customer reference')}
                    {choice(
                      'enquiryId',
                      'Enquiry / RFQ',
                      options('sales-enquiries'),
                    )}
                    {choice('projectId', 'Project', options('sales-projects'))}
                    {field('subject', 'Subject')}{' '}
                    {draft.quotationType === 'Domestic' &&
                      field('customerGstin', 'Customer GSTIN')}
                    <div className="sales-wide">
                      {field(
                        'billingAddress',
                        'Billing address',
                        'textarea',
                        true,
                      )}
                    </div>
                    <div className="sales-wide">
                      <label className="sales-checkbox">
                        <input
                          type="checkbox"
                          checked={
                            !!draft.billingAddress &&
                            draft.shippingAddress === draft.billingAddress
                          }
                          onChange={(e) =>
                            set(
                              'shippingAddress',
                              e.target.checked ? draft.billingAddress : '',
                            )
                          }
                        />
                        Same as billing
                      </label>
                      {field(
                        'shippingAddress',
                        'Shipping address',
                        'textarea',
                        true,
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="Commercial">
                  <div className="sales-fields">
                    <Choice
                      label="Currency"
                      value={draft.currencyId}
                      options={options('master-currency')}
                      required
                      onChange={(v) =>
                        setDraft((d: any) => ({
                          ...d,
                          currencyId: v,
                          currency: data.find((x) => x.id === v)?.code || '',
                        }))
                      }
                    />
                    <Choice
                      label="Price list"
                      value={draft.priceListId}
                      options={options('price-lists')}
                      onChange={(v) =>
                        setDraft((d: any) => ({
                          ...d,
                          priceListId: v,
                          discountPolicy:
                            data.find((x) => x.id === v)?.name || '',
                        }))
                      }
                    />
                    {choice(
                      'paymentTermsId',
                      'Payment terms',
                      options('master-payment-terms'),
                      true,
                    )}
                    {choice('paymentMethod', 'Payment method', [
                      'Bank transfer',
                      'Letter of credit',
                      'Cash',
                      'Cheque',
                    ])}
                    {choice(
                      'taxTreatment',
                      'Tax treatment',
                      draft.quotationType === 'Export'
                        ? [
                            'Export with tax',
                            'Export under LUT / bond',
                            'Exempt',
                          ]
                        : ['GST Registered', 'Unregistered', 'Exempt'],
                      true,
                    )}
                    {draft.quotationType === 'Domestic' ? (
                      <>
                        {field(
                          'placeOfSupply',
                          'Place of supply',
                          'text',
                          true,
                        )}
                        {choice(
                          'gstSplit',
                          'GST split',
                          ['CGST + SGST', 'IGST'],
                          true,
                        )}
                      </>
                    ) : (
                      <>
                        {field(
                          'exchangeRate',
                          'Exchange rate to INR',
                          'number',
                          true,
                        )}
                        {field('exportType', 'Export type')}
                      </>
                    )}
                    <Choice
                      label="Pricing basis"
                      value={
                        draft.taxInclusive ? 'Tax inclusive' : 'Tax exclusive'
                      }
                      options={['Tax exclusive', 'Tax inclusive']}
                      onChange={(v) =>
                        set('taxInclusive', v === 'Tax inclusive')
                      }
                    />
                    {choice('withholdingBase', 'TCS / TDS calculation base', [
                      'Taxable value',
                      'Tax inclusive',
                    ])}
                    {field('discountPolicy', 'Discount policy')}
                    {field('creditTerms', 'Credit terms')}
                    {['freight', 'insurance', 'packing', 'otherCharges'].map(
                      (k, i) => (
                        <div key={k}>
                          {field(
                            k,
                            [
                              'Freight',
                              'Insurance',
                              'Packing',
                              'Other charges',
                            ][i],
                            'number',
                          )}
                        </div>
                      ),
                    )}
                    {field('roundOff', 'Round off', 'number')}
                  </div>
                  <p className="op-note">
                    Select the tax treatment applicable to this transaction.
                    Rates come from your tax master; review them before issuing.
                  </p>
                </TabsContent>
                <TabsContent value="Items & Pricing">
                  <div className="sales-items-toolbar">
                    <h3>Items & Pricing</h3>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setItem({
                          ...freshLine(),
                          discountPercent:
                            data.find((x) => x.id === draft.priceListId)
                              ?.discountPercent || '0',
                        });
                        setItemIndex(-1);
                        setAdvanced(false);
                      }}
                    >
                      <Plus size={16} />
                      Add item
                    </Button>
                  </div>
                  {draft.lines.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {[
                            '#',
                            'Product / description',
                            'UOM',
                            'Qty',
                            'Rate',
                            'Disc.',
                            'Tax',
                            'Amount',
                            '',
                          ].map((t, i) => (
                            <TableHead key={i}>{t}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draft.lines.map((line: any, i: number) => {
                          let price: any;
                          try {
                            price = priceSales({ ...draft, lines: [line] })
                              .lines[0];
                          } catch {}
                          return (
                            <TableRow key={i}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>
                                <button
                                  className="text-link"
                                  onClick={() => {
                                    setItem({ ...line });
                                    setItemIndex(i);
                                    setAdvanced(false);
                                  }}
                                >
                                  {line.description || 'Edit item'}
                                </button>
                                <small className="sales-cell-meta">
                                  {
                                    data.find((x) => x.id === line.productId)
                                      ?.sku
                                  }
                                </small>
                              </TableCell>
                              <TableCell>{line.uom}</TableCell>
                              <TableCell>{line.quantity}</TableCell>
                              <TableCell>{line.rate}</TableCell>
                              <TableCell>
                                {line.discountPercent || 0}%
                              </TableCell>
                              <TableCell>{line.gstRate || 0}%</TableCell>
                              <TableCell>
                                {price
                                  ? money(price.total, draft.currency || 'INR')
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  aria-label={'Remove item ' + (i + 1)}
                                  onClick={() =>
                                    set(
                                      'lines',
                                      draft.lines.filter(
                                        (_: any, n: number) => n !== i,
                                      ),
                                    )
                                  }
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <Blank
                      title="Add your first item"
                      detail="Select a product to load its description, unit, price and tax defaults."
                    />
                  )}
                </TabsContent>
                <TabsContent value="Delivery">
                  <div className="sales-fields">
                    {field('deliveryTerms', 'Delivery terms')}
                    {field('expectedDelivery', 'Expected delivery')}
                    {field('deliveryDate', 'Delivery date', 'date')}
                    {choice(
                      'warehouseId',
                      'Dispatch from',
                      options('warehouses'),
                    )}
                    <Choice
                      label="Delivery location"
                      value={draft.deliveryAddressId}
                      options={data
                        .filter(
                          (r) =>
                            r.kind === 'master-delivery-addresses' &&
                            r.customerId === draft.partnerId,
                        )
                        .map((r) => ({ value: r.id, label: r.name }))}
                      onChange={(v) => {
                        set('deliveryAddressId', v);
                        set(
                          'shippingAddress',
                          data.find((r) => r.id === v)?.address ||
                            draft.shippingAddress,
                        );
                      }}
                    />
                    {choice('transportMode', 'Transport mode', [
                      'Road',
                      'Rail',
                      'Sea',
                      'Air',
                      'Courier',
                    ])}
                    {choice('shipmentMode', 'Shipment mode', [
                      'Domestic',
                      'Sea',
                      'Air',
                      'Courier',
                    ])}
                    {draft.quotationType === 'Export' && (
                      <>
                        {choice(
                          'shipmentTermsId',
                          'Incoterm',
                          options('master-shipment-terms'),
                          true,
                        )}
                        {choice(
                          'loadingPortId',
                          'Port of loading',
                          options('master-ports'),
                          true,
                        )}
                        {choice(
                          'dischargePortId',
                          'Port of discharge',
                          options('master-ports'),
                          true,
                        )}
                        {field(
                          'originCountry',
                          'Country of origin',
                          'text',
                          true,
                        )}
                        {field(
                          'destinationCountry',
                          'Country of final destination',
                          'text',
                          true,
                        )}
                        {field('finalDestination', 'Final destination')}
                        {choice(
                          'bankId',
                          'Banking details',
                          options('master-bank-details'),
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="Terms & Notes">
                  <div className="sales-fields">
                    {field('warranty', 'Warranty')}
                    {field('validityText', 'Validity clause')}
                    {field('taxClause', 'Tax clause')}
                    <Choice
                      label="Insert standard clause"
                      value=""
                      options={options('standard-clauses')}
                      onChange={(v) =>
                        set(
                          'terms',
                          (draft.terms || '') +
                            '\n' +
                            (data.find((x) => x.id === v)?.body || ''),
                        )
                      }
                    />
                    <div className="sales-full">
                      {field('terms', 'Terms & conditions', 'textarea')}
                    </div>
                    <div className="sales-full">
                      {field(
                        'customerNotes',
                        'Customer-facing notes',
                        'textarea',
                      )}
                    </div>
                    <div className="sales-full sales-internal">
                      {field(
                        'internalNotes',
                        'Internal notes — excluded from customer documents',
                        'textarea',
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="Internal Costing">
                  <div className="sales-internal-label">
                    <LockKeyhole size={17} />
                    Internal — excluded from customer documents
                  </div>
                  <div className="sales-fields">
                    {costFields.map(([key, label]) => (
                      <ValueField
                        key={key}
                        label={label}
                        type="number"
                        value={draft.internalCosting?.[key]}
                        onChange={(v) =>
                          set('internalCosting', {
                            ...draft.internalCosting,
                            [key]: v,
                          })
                        }
                      />
                    ))}
                    <ValueField
                      label="Target margin %"
                      type="number"
                      value={draft.internalCosting?.targetMargin}
                      onChange={(v) =>
                        set('internalCosting', {
                          ...draft.internalCosting,
                          targetMargin: v,
                        })
                      }
                    />
                  </div>
                  <dl className="sales-cost-summary">
                    <div>
                      <dt>Total cost</dt>
                      <dd>
                        {money(
                          Math.round(totalCost * 100),
                          draft.currency || 'INR',
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Selling value before tax</dt>
                      <dd>
                        {money(
                          Math.round(selling * 100),
                          draft.currency || 'INR',
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Gross margin</dt>
                      <dd>
                        {money(
                          Math.round((selling - totalCost) * 100),
                          draft.currency || 'INR',
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Gross margin %</dt>
                      <dd>
                        {selling
                          ? (((selling - totalCost) / selling) * 100).toFixed(
                              2,
                            ) + '%'
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Margin status</dt>
                      <dd>
                        {selling
                          ? (100 * (selling - totalCost)) / selling >=
                            Number(draft.internalCosting?.targetMargin || 0)
                            ? 'On target'
                            : 'Below target'
                          : 'Awaiting pricing'}
                      </dd>
                    </div>
                  </dl>
                </TabsContent>
              </main>
              <PricingSummary d={draft} />
            </div>
          </Tabs>
          <footer className="sales-editor-footer">
            <Button
              variant="outline"
              onClick={() => setPending({ type: 'close' })}
            >
              Cancel
            </Button>
            <span />
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => save(false)}
            >
              Save Draft
            </Button>
            <Button disabled={busy} onClick={() => save(true)}>
              Submit for Review
            </Button>
          </footer>
        </>
      ) : selected ? (
        !record ? (
          <Loading />
        ) : (
          <>
            <header className="sales-document-header">
              <div>
                <button
                  className="text-link"
                  onClick={() => {
                    setSelected('');
                    setDetail(null);
                  }}
                >
                  <ArrowLeft size={16} />
                  {title}s
                </button>
                <h2>{record.reference}</h2>
                <p>
                  {record.customerName ||
                    data.find((x) => x.id === record.partnerId)?.name}
                </p>
                <span className="sales-meta">
                  {record.date} · Revision {record.revisionNumber || 1} · Valid
                  until {record.validUntil || '—'}
                </span>
              </div>
              <div className="sales-header-value">
                <Status value={state} />
                <strong>
                  {money(record.amount || 0, record.currency || 'INR')}
                </strong>
                <div className="inline-actions">
                  {canWrite && ['Draft', 'Returned'].includes(state) && (
                    <Button variant="outline" onClick={() => begin(record)}>
                      Edit Draft
                    </Button>
                  )}
                  <Button variant="outline" onClick={print}>
                    <Printer size={16} />
                    Print / Save PDF
                  </Button>
                  {canWrite && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="outline" />}
                      >
                        <MoreHorizontal size={16} />
                        Actions
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {(quoteStates[state] || [])
                          .filter(
                            (s) =>
                              !['Approved', 'Returned'].includes(s) ||
                              user.role === 'Admin',
                          )
                          .map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => {
                                setPending({ type: 'status', status: s });
                                setReason('');
                              }}
                            >
                              {(
                                {
                                  'Under Review': 'Submit for Review',
                                  Approved: 'Approve',
                                  Returned: 'Send Back',
                                  Draft: 'Return to Draft',
                                  Sent: 'Record as Sent',
                                  Accepted: 'Mark Accepted',
                                  Rejected: 'Mark Rejected',
                                  Viewed: 'Record Viewed',
                                  Expired: 'Mark Expired',
                                } as any
                              )[s] || s}
                            </DropdownMenuItem>
                          ))}
                        {[
                          'Approved',
                          'Sent',
                          'Viewed',
                          'Accepted',
                          'Rejected',
                          'Expired',
                        ].includes(state) && (
                          <DropdownMenuItem
                            onClick={() => {
                              setPending({ type: 'revise' });
                              setReason('');
                            }}
                          >
                            Create revision
                          </DropdownMenuItem>
                        )}
                        {state === 'Accepted' &&
                          (
                            {
                              quotations: ['sales-orders', 'proformas'],
                              'sales-orders': [
                                'proformas',
                                'invoices',
                                'domestic-invoices',
                                'delivery-challans',
                              ],
                              proformas: ['invoices', 'domestic-invoices'],
                            } as any
                          )[kind]?.map((k: string) => (
                            <DropdownMenuItem
                              key={k}
                              onClick={() => {
                                setPending({ type: 'convert', target: k });
                                setReason('');
                              }}
                            >
                              Create {salesLabels[k] || 'Delivery Challan'}
                            </DropdownMenuItem>
                          ))}
                        <DropdownMenuItem
                          onClick={() =>
                            email().catch((e) => setError(e.message))
                          }
                        >
                          Prepare email draft
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              await api(`sales/${kind}/${selected}/document`, {
                                version: record.version,
                              });
                              setTab('Documents');
                              reload();
                            } catch (e: any) {
                              setError(e.message);
                            }
                          }}
                        >
                          Generate customer Word document
                        </DropdownMenuItem>
                        {['invoices', 'domestic-invoices'].includes(kind) &&
                          ['Accepted', 'Posted'].includes(state) && (
                            <DropdownMenuItem
                              onClick={() => {
                                setPending({
                                  type: 'post',
                                  status:
                                    state === 'Posted' ? 'Reversed' : 'Posted',
                                });
                                setReason('');
                              }}
                            >
                              {state === 'Posted'
                                ? 'Reverse posting'
                                : 'Post to ledger'}
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </header>
            <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
              <TabsList variant="line" className="sales-tabs">
                {[
                  'Overview',
                  'Items',
                  'Pricing',
                  'Documents',
                  'Communication',
                  'Activity / Audit',
                  'Related Transactions',
                  'Version History',
                  ...(canWrite ? ['Internal Costing'] : []),
                ].map((t) => (
                  <TabsTrigger key={t} value={t}>
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>
              <section className="widget sales-detail-body">
                <TabsContent value="Overview">
                  <dl className="sales-overview">
                    {[
                      ['Customer', record.customerName],
                      ['Subject', record.subject],
                      ['Billing address', record.billingAddress],
                      ['Shipping address', record.shippingAddress],
                      ['Currency', record.currency],
                      [
                        'Payment terms',
                        data.find((x) => x.id === record.paymentTermsId)?.name,
                      ],
                      [
                        'Salesperson',
                        users.find((x) => x.id === record.salesPersonId)?.name,
                      ],
                      ['Type', record.quotationType],
                      [
                        'Approval',
                        record.approvedBy
                          ? record.approvedBy + ' · ' + record.approvedAt
                          : 'Pending',
                      ],
                      ['Terms & conditions', record.terms],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                  {['Draft', 'Returned'].includes(state) && (
                    <div className="sales-validation">
                      <strong>Review checklist</strong>
                      {salesIssues(record).length ? (
                        salesIssues(record).map((issue, i) => (
                          <p key={i}>{issue.message}</p>
                        ))
                      ) : (
                        <p>Quotation is ready for review.</p>
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="Items">
                  <ReadItems record={record} />
                </TabsContent>
                <TabsContent value="Pricing">
                  <PricingSummary d={record} />
                </TabsContent>
                <TabsContent value="Documents">
                  <Documents
                    entity={record}
                    module={{
                      ...opMap[kind],
                      documents:
                        kind === 'quotations'
                          ? [
                              'Quotation',
                              'Technical Specification',
                              'Customer RFQ',
                              'Price Sheet',
                              'Supporting Documents',
                              'Email Correspondence',
                            ]
                          : opMap[kind].documents,
                    }}
                    data={data}
                    documents={docs}
                    canWrite={canWrite}
                    reload={reload}
                  />
                </TabsContent>
                <TabsContent value="Communication">
                  <div className="sales-items-toolbar">
                    <h3>Communication history</h3>
                    {canWrite && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPending({ type: 'communication' });
                          setReason('');
                        }}
                      >
                        Record communication
                      </Button>
                    )}
                  </div>
                  <p className="op-note">
                    Email drafts open in your mail application. Attach the
                    generated customer document there. Record delivery or
                    customer responses after confirmation; opening a draft does
                    not mark the document as sent.
                  </p>
                  {detail.communications.length ? (
                    detail.communications.map((c: any) => (
                      <article className="sales-communication" key={c.id}>
                        <strong>
                          {c.type} · {c.channel}
                        </strong>
                        <p>{c.note}</p>
                        <small>
                          {c.actor} ·{' '}
                          {new Date(c.recordedAt).toLocaleString('en-IN')}
                        </small>
                      </article>
                    ))
                  ) : (
                    <Blank title="No communication recorded" />
                  )}
                </TabsContent>
                <TabsContent value="Activity / Audit">
                  <div className="op-audit">
                    {detail.audit.map((a: any) => (
                      <article key={a.id}>
                        <span className="op-audit-dot" />
                        <div>
                          <strong>{a.action}</strong>
                          <p>
                            {a.actor} ·{' '}
                            {new Date(a.created).toLocaleString('en-IN')}
                          </p>
                          <details>
                            <summary>Change details</summary>
                            <pre>{a.detail}</pre>
                          </details>
                        </div>
                      </article>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="Related Transactions">
                  {detail.related.length ? (
                    detail.related.map((r: any) => (
                      <button
                        className="sales-related"
                        key={r.id}
                        onClick={() => go(r.kind + '?record=' + r.id)}
                      >
                        <span>
                          <strong>{r.reference || r.name}</strong>
                          <small>{opMap[r.kind]?.label}</small>
                        </span>
                        <Status value={r.status} />
                        <ChevronRight size={16} />
                      </button>
                    ))
                  ) : (
                    <Blank
                      title="No downstream transactions yet"
                      detail="Accept this document to create a linked order or invoice."
                    />
                  )}
                </TabsContent>
                <TabsContent value="Version History">
                  {detail.versions.map((r: any) => (
                    <button
                      className="sales-related"
                      key={r.id}
                      onClick={() => {
                        setSelected(r.id);
                        setTab('Overview');
                      }}
                    >
                      <span>
                        <strong>{r.reference}</strong>
                        <small>
                          Revision {r.revisionNumber || 1} · {r.created}
                        </small>
                      </span>
                      <Status value={r.status} />
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </TabsContent>
                {canWrite && (
                  <TabsContent value="Internal Costing">
                    <div className="sales-internal-label">
                      <LockKeyhole size={17} />
                      Internal — excluded from customer documents
                    </div>
                    <dl className="sales-overview">
                      {costFields.map(([k, l]) => (
                        <div key={k}>
                          <dt>{l}</dt>
                          <dd>
                            {money(
                              Math.round(
                                Number(detail.internal?.costing?.[k] || 0) *
                                  100,
                              ),
                              record.currency || 'INR',
                            )}
                          </dd>
                        </div>
                      ))}
                      <div>
                        <dt>Internal notes</dt>
                        <dd>{detail.internal?.notes || '—'}</dd>
                      </div>
                    </dl>
                  </TabsContent>
                )}
              </section>
            </Tabs>
            <section className="sales-customer-print">
              <h1>Rohit&#39;s ERP</h1>
              <h2>
                {title} {record.reference}
              </h2>
              <p>{record.customerName}</p>
              <p>
                Date: {record.date} · Valid until: {record.validUntil}
              </p>
              <p>{record.billingAddress}</p>
              <p>Delivery: {record.shippingAddress}</p>
              <ReadItems record={record} />
              <strong>
                Total: {money(record.amount || 0, record.currency || 'INR')}
              </strong>
              <p>
                Payment terms:{' '}
                {data.find((x) => x.id === record.paymentTermsId)?.name}
              </p>
              <p>
                Delivery terms: {record.deliveryTerms} ·{' '}
                {record.expectedDelivery}
              </p>
              <p>Warranty: {record.warranty}</p>
              <p>{record.validityText}</p>
              <p>{record.taxClause}</p>
              {record.quotationType === 'Export' && (
                <p>
                  Incoterm:{' '}
                  {data.find((x) => x.id === record.shipmentTermsId)?.code} ·
                  Loading:{' '}
                  {data.find((x) => x.id === record.loadingPortId)?.name} ·
                  Discharge:{' '}
                  {data.find((x) => x.id === record.dischargePortId)?.name} ·
                  Destination:{' '}
                  {record.finalDestination || record.destinationCountry}
                </p>
              )}
              <PricingSummary d={record} />
              <p>{record.terms}</p>
              <p>{record.customerNotes}</p>
            </section>
          </>
        )
      ) : (
        <>
          <header className="sales-register-header">
            <div>
              <h2>{title}s</h2>
            </div>
            {canWrite && (
              <Button onClick={() => begin()}>
                <Plus size={16} />
                New {title}
              </Button>
            )}
          </header>
          <div className="sales-status-filters">
            {[
              'All',
              'Draft',
              'Under Review',
              'Approved',
              'Sent',
              'Accepted',
              'Rejected',
              'Expiring',
              'Expired',
              'Converted',
            ].map((s) => (
              <button
                key={s}
                aria-pressed={filter === s}
                onClick={() => {
                  setFilter(s);
                  setPage(0);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="op-toolbar">
            <Search size={17} />
            <Input
              aria-label={'Search ' + title + 's'}
              placeholder="Search number or customer…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
            <Button
              variant="outline"
              onClick={() =>
                exportCSV(
                  rows.map((r) => ({
                    number: r.reference,
                    customer: r.customerName,
                    date: r.date,
                    validUntil: r.validUntil,
                    amount: (r.amount || 0) / 100,
                    currency: r.currency,
                    status: r.status,
                    revision: r.revisionNumber || 1,
                  })),
                  title + 's',
                )
              }
            >
              <Download size={16} />
              Export
            </Button>
          </div>
          <section className="widget">
            {rows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      title,
                      'Customer',
                      'Date',
                      'Valid Until',
                      'Amount',
                      'Status',
                      'Owner',
                    ].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(page * 20, page * 20 + 20).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <button
                          className="text-link"
                          onClick={() => {
                            setSelected(r.id);
                            setTab('Overview');
                          }}
                        >
                          {r.reference}
                        </button>
                        <small className="sales-cell-meta">
                          Revision {r.revisionNumber || 1}
                        </small>
                      </TableCell>
                      <TableCell>
                        {r.customerName ||
                          data.find((x) => x.id === r.partnerId)?.name}
                      </TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell>{r.validUntil || '—'}</TableCell>
                      <TableCell>
                        {money(r.amount || 0, r.currency || 'INR')}
                      </TableCell>
                      <TableCell>
                        <Status value={r.status || 'Draft'} />
                      </TableCell>
                      <TableCell>
                        {users.find((u) => u.id === r.salesPersonId)?.name ||
                          r.createdBy ||
                          '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Blank
                title={'No ' + title.toLowerCase() + 's found'}
                detail={
                  'Create a new ' +
                  title.toLowerCase() +
                  ' or change the filters.'
                }
              />
            )}
            <footer className="op-pagination">
              <span>
                {rows.length} documents · FY {fy}
              </span>
              <div className="inline-actions">
                <Button
                  variant="outline"
                  disabled={!page}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={(page + 1) * 20 >= rows.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </footer>
          </section>
        </>
      )}
      <Dialog open={!!item} onOpenChange={(open) => !open && setItem(null)}>
        <DialogContent className="sales-item-dialog">
          <DialogTitle>
            {itemIndex < 0 ? 'Add item' : 'Edit item ' + (itemIndex + 1)}
          </DialogTitle>
          <DialogDescription>
            Product defaults can be adjusted for this document.
          </DialogDescription>
          {item && (
            <>
              <div className="sales-fields">
                <Choice
                  label="Product"
                  value={item.productId}
                  options={options('products')}
                  required
                  onChange={(v) => {
                    const p = data.find((x) => x.id === v);
                    setItem({
                      ...item,
                      productId: v,
                      description: p?.name || '',
                      rate: p?.defaultRate || '',
                      uom:
                        data.find((x) => x.id === p?.unitId)?.code ||
                        p?.unit ||
                        '',
                      hsn: p?.hsn || '',
                      gstRate:
                        data.find((x) => x.id === p?.taxCodeId)?.gstRate ||
                        p?.gstRate ||
                        '0',
                      taxCodeId: p?.taxCodeId || '',
                      tcsRate:
                        data.find((x) => x.id === p?.taxCodeId)?.tcsRate || '0',
                      tdsRate:
                        data.find((x) => x.id === p?.taxCodeId)?.tdsRate || '0',
                    });
                  }}
                />
                <ValueField
                  label="Description"
                  value={item.description}
                  onChange={(v) => setItem({ ...item, description: v })}
                  required
                />
                <ValueField
                  label="Quantity"
                  type="number"
                  value={item.quantity}
                  onChange={(v) => setItem({ ...item, quantity: v })}
                  required
                />
                <Choice
                  label="UOM"
                  value={item.uom}
                  options={data
                    .filter((r) => r.kind === 'master-units')
                    .map((r) => ({ value: r.code || r.name, label: r.name }))}
                  onChange={(v) => setItem({ ...item, uom: v })}
                  required
                />
                <ValueField
                  label="Unit price"
                  type="number"
                  value={item.rate}
                  onChange={(v) => setItem({ ...item, rate: v })}
                  required
                />
                <ValueField
                  label="Discount %"
                  type="number"
                  value={item.discountPercent}
                  onChange={(v) => setItem({ ...item, discountPercent: v })}
                />
                <Choice
                  label="Tax code"
                  value={item.taxCodeId}
                  options={options('tax-codes')}
                  required
                  onChange={(v) => {
                    const t = data.find((x) => x.id === v);
                    setItem({
                      ...item,
                      taxCodeId: v,
                      gstRate: t?.gstRate || '0',
                      tcsRate: t?.tcsRate || '0',
                      tdsRate: t?.tdsRate || '0',
                    });
                  }}
                />
              </div>
              <button
                className="sales-advanced-toggle"
                aria-expanded={advanced}
                onClick={() => setAdvanced(!advanced)}
              >
                Advanced <ChevronRight size={14} />
              </button>
              {advanced && (
                <div className="sales-fields">
                  <ValueField
                    label="HSN / SAC"
                    value={item.hsn}
                    onChange={(v) => setItem({ ...item, hsn: v })}
                  />
                  <Choice
                    label="Warehouse"
                    value={item.warehouseId}
                    options={options('warehouses')}
                    onChange={(v) => setItem({ ...item, warehouseId: v })}
                  />
                  <ValueField
                    label="Delivery date"
                    type="date"
                    value={item.deliveryDate}
                    onChange={(v) => setItem({ ...item, deliveryDate: v })}
                  />
                  <ValueField
                    label="Serial numbers (optional at quotation stage)"
                    value={item.serialNumbers}
                    onChange={(v) => setItem({ ...item, serialNumbers: v })}
                  />
                  {user.role === 'Admin' && (
                    <div className="sales-full">
                      <label className="sales-checkbox">
                        <input
                          type="checkbox"
                          checked={!!item.overrideEnabled}
                          onChange={(e) =>
                            setItem({
                              ...item,
                              overrideEnabled: e.target.checked,
                            })
                          }
                        />
                        Enable authorised tax adjustment
                      </label>
                      {item.overrideEnabled && (
                        <div className="sales-fields">
                          {[
                            ['gstOverride', 'GST amount'],
                            ['tcsOverride', 'TCS amount'],
                            ['tdsOverride', 'TDS amount'],
                            ['overrideReason', 'Override reason'],
                          ].map(([k, l]) => (
                            <ValueField
                              key={k}
                              label={l}
                              type={k === 'overrideReason' ? 'text' : 'number'}
                              value={item[k]}
                              onChange={(v) => setItem({ ...item, [k]: v })}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="inline-actions">
                <Button variant="outline" onClick={() => setItem(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    try {
                      priceSales({ ...draft, lines: [item] });
                      set(
                        'lines',
                        itemIndex < 0
                          ? [...draft.lines, item]
                          : draft.lines.map((l: any, i: number) =>
                              i === itemIndex ? item : l,
                            ),
                      );
                      setItem(null);
                      setError('');
                    } catch (e: any) {
                      setError(e.message);
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
              {error && (
                <p role="alert" className="error-box">
                  {error}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!pending}
        onOpenChange={(o) => !o && !busy && setPending(null)}
      >
        <DialogContent>
          <DialogTitle>
            {pending?.type === 'close'
              ? 'Leave the editor?'
              : pending?.type === 'revise'
                ? 'Create a new revision'
                : pending?.type === 'convert'
                  ? 'Create ' +
                    (salesLabels[pending.target] || 'Delivery Challan')
                  : pending?.type === 'communication'
                    ? 'Record communication'
                    : pending?.status || 'Document action'}
          </DialogTitle>
          <DialogDescription>
            {pending?.type === 'close'
              ? 'Your last protected draft can be restored when you reopen the editor.'
              : pending?.type === 'revise'
                ? 'The current version will be locked. A new draft revision will preserve the previous document.'
                : 'This action and your reason will be recorded in the audit trail.'}
          </DialogDescription>
          {pending?.type !== 'close' && (
            <>
              <ValueField
                label="Reason / confirmation details"
                value={reason}
                onChange={setReason}
                required
              />
              {(pending?.status === 'Sent' ||
                pending?.type === 'communication') && (
                <Choice
                  label="Channel"
                  value={channel}
                  options={[
                    'Email',
                    'Phone',
                    'In person',
                    'Customer portal',
                    'Manual record',
                  ]}
                  onChange={setChannel}
                />
              )}
            </>
          )}
          {error && (
            <p role="alert" className="error-box">
              {error}
            </p>
          )}
          <div className="inline-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={busy || (pending?.type !== 'close' && !reason.trim())}
              onClick={async () => {
                if (pending.type === 'close') {
                  setBusy(true);
                  try {
                    await queue.current;
                    await api('sales/draft/' + draftKey, { payload: draft });
                    setEditing(false);
                    setPending(null);
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                  return;
                }
                if (pending.type === 'post') {
                  setBusy(true);
                  try {
                    await api(`operations/${kind}/${selected}/status`, {
                      status: pending.status,
                      version: record.version,
                      reason,
                    });
                    setPending(null);
                    reload();
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                  return;
                }
                await act();
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ReadItems({ record }: { record: any }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {[
            'Description',
            'UOM',
            'Qty',
            'Rate',
            'Discount',
            'Tax',
            'Amount',
          ].map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {(record.lines || []).map((l: any, i: number) => (
          <TableRow key={i}>
            <TableCell>{l.description}</TableCell>
            <TableCell>{l.uom}</TableCell>
            <TableCell>{l.quantity}</TableCell>
            <TableCell>{l.rate}</TableCell>
            <TableCell>{l.discountPercent || 0}%</TableCell>
            <TableCell>{l.gstRate || 0}%</TableCell>
            <TableCell>
              {money(l.total || 0, record.currency || 'INR')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
