'use client';
import { Button } from './ui/button';
import { money, dateLabel } from './erp-ui';
import { entityLabel, entityType } from '@/lib/relationships';
import { transactionLink } from './process-workspace';
import { useDataView } from './data-view';
const named = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());
export function RecordSummary({
  data,
  go,
  section,
  items = false,
}: {
  data: any;
  go: any;
  section: any;
  items?: boolean;
}) {
  const { includes } = useDataView();
  const r = data.record,
    nodes = data.records || [],
    party = nodes.find((x: any) => x.id === r.partnerId),
    position = (data.financial?.lines || []).find((x: any) => x.id === r.id);
  const currency = position?.currency || r.currency || 'INR',
    amount = position?.amount ?? r.amount;
  const related = nodes.filter((x: any) => x.id !== r.id),
    units = related.filter((x: any) => x.kind === 'machines'),
    sales = related.filter((x: any) =>
      ['invoices', 'domestic-invoices'].includes(x.kind),
    );
  const transactions = (data.transactions || []).filter(
    (x: any) =>
      includes(x) && !['Cancelled', 'Closed', 'Completed'].includes(x.status),
  );
  const profile =
    ['customers', 'vendors', 'products', 'warehouses'].includes(r.kind) ||
    r.kind.startsWith('master-');
  const excluded = new Set([
    'id',
    'kind',
    'version',
    'operation',
    'importLocked',
    'importBatch',
    'sourceAmountExact',
    'sourceId',
    'partnerId',
    'dataState',
    'amountDerived',
    'created',
    'updated',
    'reference',
    'originalReference',
    'amount',
    'currency',
    'status',
    'totalUsd',
    'fy',
    'date',
    'notes',
  ]);
  const details = Object.entries(r).filter(
    ([k, v]) =>
      !excluded.has(k) &&
      !k.startsWith('source') &&
      !k.endsWith('Id') &&
      v !== null &&
      v !== undefined &&
      v !== '' &&
      typeof v !== 'object',
  );
  const facts = (rows: any[]) => (
    <dl className="key-information">
      {rows
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => (
          <div key={k}>
            <dt>{named(k)}</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
    </dl>
  );
  if (items)
    return (
      <section className="record-items">
        <h3>Items & serialized units</h3>
        <div className="simple-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item / description</th>
                <th>Serial number</th>
                <th>Qty</th>
                <th>Basic · {r.currency || 'INR'}</th>
                <th>GST · {r.currency || 'INR'}</th>
                <th>Total · {r.currency || 'INR'}</th>
              </tr>
            </thead>
            <tbody>
              {(r.lines || []).map((l: any, i: number) => (
                <tr key={i}>
                  <td>{l.description || l.productName || '—'}</td>
                  <td>{l.serialNumber || l.serialNumbers || '—'}</td>
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
        {!(r.lines || []).length && <p>No item lines recorded.</p>}
        {units.map((u: any) => (
          <button
            className="related-line"
            key={u.id}
            onClick={() => go(transactionLink(u.id))}
          >
            {u.serialNumber || entityLabel(u)} <span>{u.status}</span>
          </button>
        ))}
      </section>
    );
  return (
    <div className="decision-overview">
      <section className="decision-finance">
        <h3>{profile ? 'Open items' : 'Financial position'}</h3>
        {position ? (
          <div className="decision-values">
            <div>
              <span>Invoice value · {currency}</span>
              <strong>{money(amount, currency)}</strong>
            </div>
            <div>
              <span>Settled · {currency}</span>
              <strong>{money(position.settled, currency)}</strong>
            </div>
            <div>
              <span>Receivable / payable · {currency}</span>
              <strong>{money(position.balance, currency)}</strong>
            </div>
          </div>
        ) : amount !== undefined ? (
          <strong>{money(Number(amount), currency)}</strong>
        ) : (
          <div className="decision-values">
            {(data.financial?.summary || []).slice(0, 4).map((x: any) => (
              <div key={x.label}>
                <span>{x.label}</span>
                <strong>{money(x.balance, x.currency)}</strong>
              </div>
            ))}
          </div>
        )}
        <button className="text-link" onClick={() => section('Finance')}>
          Open finance →
        </button>
      </section>
      <section>
        <h3>{profile ? 'Profile' : 'Key information'}</h3>
        {facts([
          [
            'customer / supplier',
            party?.name || r.customerName || r.supplierName || r.party,
          ],
          ['reference', entityLabel(r)],
          ['date', dateLabel(r.date)],
          [
            'current status',
            r.sourceStatus || data.lifecycle?.status || r.status,
          ],
          [
            'shipment',
            related.find((x: any) =>
              ['shipments', 'bills-of-lading'].includes(x.kind),
            )?.reference,
          ],
          [
            'equipment',
            units.length
              ? `${units.length} serialized units`
              : r.lines?.length
                ? `${r.lines.length} item lines`
                : undefined,
          ],
          ['serial number', r.serialNumber],
          [
            'sale',
            r.kind === 'machines'
              ? sales.map((x: any) => entityLabel(x)).join(', ')
              : undefined,
          ],
          ...details.filter(([k]) =>
            [
              'email',
              'phone',
              'country',
              'billingAddress',
              'address',
              'model',
              'brand',
            ].includes(k),
          ),
        ])}
      </section>
      {profile && transactions.length > 0 && (
        <section>
          <h3>
            Current transactions <small>{transactions.length}</small>
          </h3>
          {transactions.slice(0, 5).map((t: any) => (
            <button
              className="related-line"
              key={t.id}
              onClick={() => go(transactionLink(t.id))}
            >
              <strong>{t.reference}</strong>
              <span>{t.party}</span>
              <span>{t.stage}</span>
            </button>
          ))}
          {transactions.length > 5 && (
            <Button variant="ghost" onClick={() => section('Transactions')}>
              View all transactions
            </Button>
          )}
        </section>
      )}
      {['products', 'machines'].includes(r.kind) && (
        <section>
          <h3>
            {r.kind === 'products'
              ? 'Serialized units'
              : 'Product / equipment model'}
          </h3>
          {r.kind === 'products'
            ? units.map((u: any) => (
                <button
                  className="related-line"
                  key={u.id}
                  onClick={() => go(transactionLink(u.id))}
                >
                  <span>{u.serialNumber || entityLabel(u)}</span>
                  <span>{u.status}</span>
                </button>
              ))
            : related
                .filter((x: any) => x.kind === 'products')
                .map((p: any) => (
                  <button
                    className="related-line"
                    key={p.id}
                    onClick={() => go(transactionLink(p.id))}
                  >
                    {entityLabel(p)}
                  </button>
                ))}
          {r.kind === 'products' && !units.length && (
            <p>No serialized units linked.</p>
          )}
        </section>
      )}
      {!!details.length && (
        <details className="profile-details">
          <summary>
            {profile
              ? 'Contacts, addresses, terms & other profile information'
              : 'Additional business information'}
          </summary>
          {facts(details)}
        </details>
      )}
      <div className="overview-links">
        <Button variant="outline" onClick={() => section('Items')}>
          View items
        </Button>
        <Button variant="outline" onClick={() => section('Documents')}>
          View documents
        </Button>
        <Button variant="outline" onClick={() => section('Timeline')}>
          View history
        </Button>
      </div>
    </div>
  );
}
