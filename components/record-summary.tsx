'use client';
import {
  Building2,
  Package,
  ArrowUpRight,
  CalendarDays,
  FileText,
} from 'lucide-react';
import { Button } from './ui/button';
import { money, dateLabel } from './erp-ui';
import { entityLabel, entityType } from '@/lib/relationships';

const named = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
export function RecordSummary({
  data,
  go,
  section,
}: {
  data: any;
  go: (route: string) => void;
  section: (tab: string) => void;
}) {
  const r = data.record,
    records = data.records || [];
  const party = records.find((x: any) => x.id === r.partnerId);
  const linked = records.filter(
    (x: any) =>
      x.id !== r.id &&
      !['op-document', 'documents', 'workbook-fact'].includes(x.kind),
  );
  const position = (data.financial?.lines || []).find(
    (x: any) => x.id === r.id,
  );
  const currency = position?.currency || r.currency || 'INR';
  const amount = position?.amount ?? r.amount;
  const coreKeys = [
    'reference',
    'originalReference',
    'name',
    'customerName',
    'supplierName',
    'party',
    'date',
    'currency',
    'amount',
    'status',
    'sourceStatus',
    'fy',
    'totalUsd',
  ];
  const ignored = new Set([
    'id',
    'kind',
    'operation',
    'version',
    'created',
    'updated',
    'importLocked',
    'importBatch',
    'sourceAmountExact',
    'sourceRow',
    'sourceId',
    'partnerId',
    'relatedIds',
    'lines',
    'totals',
    'sourceFacts',
    'sourceWorkbook',
    'amountDerived',
    'sourceInvoiceValue',
  ]);
  const fields = Object.entries(r).filter(
    ([k, v]) =>
      !ignored.has(k) &&
      !coreKeys.includes(k) &&
      !k.startsWith('source') &&
      !k.startsWith('import') &&
      !k.endsWith('Id') &&
      v !== '' &&
      v !== null &&
      v !== undefined &&
      typeof v !== 'object',
  );
  const groups = [
    {
      title: 'Contact & address',
      keys: [
        'email',
        'phone',
        'mobile',
        'contactName',
        'address',
        'billingAddress',
        'shippingAddress',
        'city',
        'state',
        'country',
        'postalCode',
        'gstin',
        'pan',
      ],
    },
    {
      title: 'Trade & delivery',
      keys: [
        'quotationType',
        'subject',
        'incoterm',
        'incoterms',
        'paymentTerms',
        'deliveryDate',
        'dueDate',
        'portOfLoading',
        'portOfDischarge',
        'destination',
        'consignee',
        'notifyParty',
        'shippingMethod',
      ],
    },
    {
      title: 'Equipment',
      keys: [
        'serialNumber',
        'brand',
        'model',
        'hsn',
        'uom',
        'location',
        'condition',
        'year',
        'quantity',
        'weight',
      ],
    },
  ];
  const grouped = new Set(groups.flatMap((g) => g.keys));
  const extra = fields.filter(([k]) => !grouped.has(k));
  const next = (data.pending || []).find((x: any) => !x.complete);
  const details = (entries: any[]) => (
    <dl className="record-facts">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt>{named(k)}</dt>
          <dd>{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
  return (
    <div className="record-summary">
      <section className="record-party-strip">
        <div className="record-party-icon">
          <Building2 size={23} />
        </div>
        <div>
          <span>
            {party
              ? entityType(party.kind)
              : r.customerName
                ? 'Customer'
                : 'Record'}
          </span>
          <h3>
            {party?.name ||
              r.customerName ||
              r.supplierName ||
              r.party ||
              r.name ||
              entityType(r.kind)}
          </h3>
        </div>
        {party && (
          <Button
            variant="ghost"
            onClick={() =>
              go('record360?record=' + encodeURIComponent(party.id))
            }
          >
            View profile <ArrowUpRight size={16} />
          </Button>
        )}
        <div className="record-date">
          <CalendarDays size={17} />
          <span>
            {dateLabel(r.date)}
            <small>Financial year {r.fy || '—'}</small>
          </span>
        </div>
      </section>
      {amount !== undefined && (
        <div className="record-money-strip">
          <div>
            <span>
              {position ? 'Invoice value' : 'Recorded value'} · {currency}
            </span>
            <strong>{money(Number(amount), currency)}</strong>
          </div>
          {position && (
            <>
              <div>
                <span>Settled · {currency}</span>
                <strong>{money(position.settled, currency)}</strong>
              </div>
              <div className="record-balance">
                <span>Balance · {currency}</span>
                <strong>{money(position.balance, currency)}</strong>
                <button onClick={() => section('Finance')}>
                  View payments <ArrowUpRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <div className="record-body-grid">
        <div className="record-primary">
          <section className="record-card">
            <header>
              <Package size={19} />
              <h3>{r.lines?.length ? 'Items' : 'Record details'}</h3>
              <span>
                {r.lines?.length
                  ? `${r.lines.length} line${r.lines.length === 1 ? '' : 's'}`
                  : ''}
              </span>
            </header>
            {r.lines?.length ? (
              <div className="record-line-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Item / description</th>
                      <th>Qty</th>
                      <th>Basic · {r.currency || 'INR'}</th>
                      <th>Tax · {r.currency || 'INR'}</th>
                      <th>Total · {r.currency || 'INR'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.lines.map((l: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <strong>
                            {l.description ||
                              l.productName ||
                              records.find((x: any) => x.id === l.productId)
                                ?.name ||
                              `Item ${i + 1}`}
                          </strong>
                          {(l.serialNumber || l.serialNumbers) && (
                            <small>
                              Serial: {l.serialNumber || l.serialNumbers}
                            </small>
                          )}
                        </td>
                        <td>
                          {l.quantity ?? '—'} {l.uom || ''}
                        </td>
                        <td>
                          {l.basic !== undefined
                            ? money(Number(l.basic), r.currency || 'INR')
                            : '—'}
                        </td>
                        <td>
                          {l.gst !== undefined
                            ? money(Number(l.gst), r.currency || 'INR')
                            : '—'}
                        </td>
                        <td>
                          {l.total !== undefined
                            ? money(Number(l.total), r.currency || 'INR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="record-card-content">
                {details([
                  ['reference', entityLabel(r)],
                  ['status', r.sourceStatus || r.status || 'Recorded'],
                  ...fields.slice(0, 6),
                ])}
              </div>
            )}
          </section>
          {groups.map((g) => {
            const entries = fields.filter(([k]) => g.keys.includes(k));
            return entries.length ? (
              <section className="record-card" key={g.title}>
                <header>
                  <h3>{g.title}</h3>
                </header>
                <div className="record-card-content">{details(entries)}</div>
              </section>
            ) : null;
          })}
          {!!extra.length && (
            <details className="record-card record-additional">
              <summary>
                Additional information <span>{extra.length} fields</span>
              </summary>
              <div className="record-card-content">{details(extra)}</div>
            </details>
          )}
        </div>
        <aside className="record-side">
          <section className="record-card">
            <header>
              <h3>Current progress</h3>
            </header>
            <div className="record-card-content">
              <p className="record-current-status">
                {r.sourceStatus || r.status || 'Recorded'}
              </p>
              {next ? (
                <>
                  <p>{next.action}</p>
                  <Button variant="outline" onClick={() => section('Tasks')}>
                    Review next action <ArrowUpRight size={15} />
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => section('Timeline')}>
                  View activity
                </Button>
              )}
            </div>
          </section>
          <section className="record-card">
            <header>
              <FileText size={18} />
              <h3>Related records</h3>
              <span>{linked.length}</span>
            </header>
            <div className="record-linked-list">
              {linked.slice(0, 5).map((x: any) => (
                <button
                  key={x.id}
                  onClick={() =>
                    go('record360?record=' + encodeURIComponent(x.id))
                  }
                >
                  <span>
                    <small>{entityType(x.kind)}</small>
                    <strong>{entityLabel(x)}</strong>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
              {!linked.length && <p>No linked transactions recorded.</p>}
              {linked.length > 5 && (
                <Button variant="ghost" onClick={() => section('Transactions')}>
                  View all {linked.length}
                </Button>
              )}
            </div>
          </section>
          {r.importLocked && (
            <p className="record-history-note">
              Historical record. Original figures are preserved.{' '}
              <button onClick={() => section('Source & Migration')}>
                View source
              </button>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
