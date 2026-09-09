'use client';
import { useState, useEffect } from 'react';
import { Download, ArrowUpRight, Search } from 'lucide-react';
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
import { api, Blank, Loading, Status, money, exportCSV, today } from './erp-ui';
import { opMap, operationModules } from '@/lib/operations';
export const reportRoutes: Record<
  string,
  { title: string; kinds?: string[]; mode?: string }
> = {
  receivables: {
    title: 'Receivables',
    kinds: ['invoices', 'domestic-invoices'],
    mode: 'outstanding',
  },
  payables: {
    title: 'Payables',
    kinds: ['bills', 'purchase-invoices', 'expenses'],
    mode: 'outstanding',
  },
  'sales-report': {
    title: 'Sales Register',
    kinds: ['invoices', 'domestic-invoices'],
  },
  'tasks-pending-tasks': {
    title: 'Pending Tasks',
    kinds: ['tasks'],
    mode: 'pending-tasks',
  },
  'tasks-completed': {
    title: 'Completed Tasks',
    kinds: ['tasks'],
    mode: 'completed-tasks',
  },
  'documents-generated-documents': {
    title: 'Generated Documents',
    mode: 'generated',
  },
  'sales-export-documents': { title: 'Export Documents', mode: 'documents' },
  'documents-transaction-documents': {
    title: 'Transaction Documents',
    mode: 'documents',
  },
  'documents-export-documents': {
    title: 'Export Documents',
    mode: 'documents',
  },
  'documents-domestic-documents': {
    title: 'Domestic Documents',
    mode: 'documents',
  },
  'documents-uploaded-documents': {
    title: 'Uploaded Documents',
    mode: 'documents',
  },
  'documents-drive': { title: 'Document Drive', mode: 'documents' },
  'inventory-stock-register': { title: 'Stock Register', kinds: ['machines'] },
  'inventory-stock-ageing': {
    title: 'Stock Ageing',
    kinds: ['machines'],
    mode: 'ageing',
  },
  'inventory-yard-location-stock': {
    title: 'Location Stock',
    kinds: ['machines'],
  },
  'inventory-inventory-valuation': {
    title: 'Inventory Valuation',
    kinds: ['machines'],
    mode: 'valuation',
  },
  'inventory-inventory-reports': {
    title: 'Inventory Reports',
    kinds: ['machines'],
  },
  'logistics-shipment-tracking': {
    title: 'Shipment Tracking',
    kinds: ['shipments', 'bills-of-lading', 'delivery-challans'],
  },
  'finance-remittance-forex': {
    title: 'Remittance & Forex',
    kinds: ['receipts'],
  },
  'finance-financial-reports': {
    title: 'Financial Reports',
    kinds: [
      'invoices',
      'domestic-invoices',
      'purchase-invoices',
      'expenses',
      'receipts',
      'payments',
    ],
  },
  'finance-tax': {
    title: 'Tax Register',
    kinds: ['invoices', 'domestic-invoices', 'purchase-invoices', 'expenses'],
    mode: 'tax',
  },
  'compliance-compliance-overview': {
    title: 'Compliance Overview',
    kinds: ['shipping-bills', 'eway-bills', 'ebrc', 'incentives'],
    mode: 'deadlines',
  },
  'compliance-leo-watch': {
    title: 'LEO Watch',
    kinds: ['shipping-bills'],
    mode: 'deadlines',
  },
  'compliance-fema-realisation': {
    title: 'FEMA Realisation',
    kinds: ['invoices'],
    mode: 'deadlines',
  },
  'compliance-pending-ebrc': {
    title: 'Pending eBRC',
    kinds: ['invoices'],
    mode: 'missing-ebrc',
  },
  'compliance-ebrc-mismatch': {
    title: 'eBRC Reconciliation',
    kinds: ['ebrc'],
    mode: 'reconcile',
  },
  'compliance-tds': {
    title: 'TDS Register',
    kinds: ['invoices', 'domestic-invoices', 'purchase-invoices', 'expenses'],
    mode: 'tax',
  },
  'compliance-compliance-reports': {
    title: 'Compliance Reports',
    kinds: ['shipping-bills', 'eway-bills', 'ebrc', 'incentives'],
    mode: 'deadlines',
  },
  'reports-purchase-reports': {
    title: 'Purchase Reports',
    kinds: [
      'purchase-orders',
      'purchase-invoices',
      'expenses',
      'supplier-advances',
    ],
  },
  'reports-inventory-reports': {
    title: 'Inventory Reports',
    kinds: ['machines'],
  },
  'reports-finance-reports': {
    title: 'Finance Reports',
    kinds: ['invoices', 'domestic-invoices', 'receipts', 'payments'],
  },
  'reports-export-reports': {
    title: 'Export Reports',
    kinds: [
      'invoices',
      'shipping-bills',
      'bills-of-lading',
      'ebrc',
      'incentives',
    ],
  },
  'reports-logistics-reports': {
    title: 'Logistics Reports',
    kinds: ['shipments', 'delivery-challans', 'bills-of-lading'],
  },
  'reports-compliance-reports': {
    title: 'Compliance Reports',
    kinds: ['shipping-bills', 'eway-bills', 'ebrc'],
    mode: 'deadlines',
  },
  'reports-costing-reports': {
    title: 'Costing Reports',
    kinds: ['costing-sheets'],
  },
  'reports-custom-reports': { title: 'Custom Report', mode: 'custom' },
  'costing-shipment-costing': {
    title: 'Shipment Costing',
    kinds: ['costing-sheets'],
  },
  'costing-product-costing': {
    title: 'Product Costing',
    kinds: ['costing-sheets'],
  },
  'costing-order-profitability': {
    title: 'Order Profitability',
    kinds: ['costing-sheets'],
  },
  'costing-margin-analysis': {
    title: 'Margin Analysis',
    kinds: ['costing-sheets'],
  },
  'production-production-planning': {
    title: 'Production Planning',
    kinds: ['production-orders'],
  },
  'production-production-reports': {
    title: 'Production Reports',
    kinds: ['production-orders'],
  },
  'import-import-documents': { title: 'Import Documents', mode: 'documents' },
  'import-import-shipments': {
    title: 'Import Shipments',
    kinds: ['import-orders', 'bill-of-entry'],
  },
};
export function OperationReports({
  route,
  fy,
  go,
}: {
  route: string;
  fy: string;
  go: (r: string) => void;
}) {
  const config = reportRoutes[route];
  const [data, setData] = useState<any[]>([]),
    [files, setFiles] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [kind, setKind] = useState('All'),
    [status, setStatus] = useState('All');
  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([api('operations/data'), api('operations/documents')])
      .then(([d, f]) => {
        if (live) {
          setData(d);
          setFiles(f);
        }
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [route]);
  if (loading) return <Loading />;
  if (error)
    return (
      <div role="alert" className="error-box">
        {error}
      </div>
    );
  let rows = ['documents', 'generated'].includes(config.mode || '')
    ? files
    : data.filter(
        (r) =>
          (!config.kinds || config.kinds.includes(r.kind)) &&
          (opMap[r.kind]?.master || r.fy === fy),
      );
  if (config.mode === 'pending-tasks')
    rows = rows.filter((r) => !['Completed', 'Cancelled'].includes(r.status));
  if (config.mode === 'completed-tasks')
    rows = rows.filter((r) => r.status === 'Completed');
  if (config.mode === 'generated') rows = files.filter((r) => r.generated);
  if (config.mode === 'missing-ebrc')
    rows = rows.filter(
      (r) =>
        r.status === 'Posted' &&
        !data.some((d) => d.kind === 'ebrc' && d.sourceId === r.id),
    );
  rows = rows.filter(
    (r) =>
      (kind === 'All' || r.kind === kind) &&
      (status === 'All' || r.status === status) &&
      JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
  );
  const due = (r: any) =>
    r.leoDueDate || r.realisationDue || r.validUntil || r.dueDate || '';
  const age = (r: any) =>
    Math.max(
      0,
      Math.floor(
        (Date.parse(today()) - Date.parse(r.date || r.created)) / 86400000,
      ),
    );
  if (route === 'documents-drive') {
    const entities = data.filter(
      (r) =>
        !opMap[r.kind]?.master &&
        opMap[r.kind]?.documents.length &&
        JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <div className="op-workspace">
        <div className="op-toolbar">
          <Input
            aria-label="Search lifecycle documents"
            placeholder="Search transactions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() =>
              exportCSV(
                entities.flatMap((r) =>
                  opMap[r.kind].documents.map((category) => ({
                    reference: r.reference,
                    module: opMap[r.kind].label,
                    category,
                    status: files.some(
                      (f) => f.entityId === r.id && f.category === category,
                    )
                      ? 'Uploaded'
                      : 'Missing',
                  })),
                ),
                'Document checklist',
              )
            }
          >
            Export checklist
          </Button>
        </div>
        <section className="widget">
          {entities.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {['Transaction', 'Required document', 'Status', 'Open'].map(
                    (h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.flatMap((r) =>
                  opMap[r.kind].documents.map((category) => (
                    <TableRow key={r.id + category}>
                      <TableCell>{r.reference}</TableCell>
                      <TableCell>{category}</TableCell>
                      <TableCell>
                        <Status
                          value={
                            files.some(
                              (f) =>
                                f.entityId === r.id && f.category === category,
                            )
                              ? 'Uploaded'
                              : 'Missing'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          onClick={() => go(r.kind + '?record=' + r.id)}
                        >
                          Open transaction
                        </Button>
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          ) : (
            <Blank
              title="No document checklists yet"
              detail="Create a purchase, sales or shipping record to track its required documents."
            />
          )}
        </section>
      </div>
    );
  }
  if (config.mode === 'outstanding')
    rows = rows
      .filter((r) => r.status === 'Posted')
      .map((r) => ({
        ...r,
        invoiceValue: r.amount,
        amount:
          r.amount -
          data
            .filter((p) => p.invoiceId === r.id && p.status === 'Posted')
            .reduce((sum, p) => sum + p.amount, 0),
      }))
      .filter((r) => r.amount > 0);
  const downloadRows = rows.map((r) => ({
    reference: r.reference || r.filename || r.name,
    module: opMap[r.kind]?.label || r.entityKind,
    status: r.status,
    date: r.date || r.created,
    currency: r.currency || '',
    amount: r.amount ? r.amount / 100 : '',
    deadline: due(r),
    ageDays: age(r),
  }));
  return (
    <div className="op-workspace">
      <div className="op-toolbar">
        <Search size={17} />
        <Input
          placeholder="Search records…"
          aria-label="Search report"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {config.mode === 'custom' && (
          <select
            aria-label="Module"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option>All</option>
            {[...new Set(data.map((r) => r.kind))].map((k) => (
              <option key={k} value={k}>
                {opMap[k]?.label}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>All</option>
          {[...new Set(data.map((r) => r.status).filter(Boolean))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Button
          variant="outline"
          onClick={() => exportCSV(downloadRows, config.title)}
        >
          <Download size={16} />
          Export report
        </Button>
      </div>
      {config.mode === 'deadlines' && (
        <p className="op-note">
          Deadlines come from the saved records. Review them against your
          applicable requirements; this register does not submit government
          filings.
        </p>
      )}
      <section className="widget">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  'Reference',
                  'Module',
                  'Status',
                  ...(['documents', 'generated'].includes(config.mode || '')
                    ? ['Category', 'Version']
                    : ['Date', 'Value']),
                  ...(['deadlines', 'ageing'].includes(config.mode || '')
                    ? ['Deadline / age']
                    : []),
                  ...(config.mode === 'tax' ? ['GST', 'TCS', 'TDS'] : []),
                  'Open',
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.reference || r.name || r.filename}</TableCell>
                  <TableCell>
                    {opMap[r.kind]?.label || opMap[r.entityKind]?.label}
                  </TableCell>
                  <TableCell>
                    <Status value={r.status || 'Active'} />
                  </TableCell>
                  {['documents', 'generated'].includes(config.mode || '') ? (
                    <>
                      <TableCell>{r.category}</TableCell>
                      <TableCell>{r.documentVersion}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{r.date || r.created.slice(0, 10)}</TableCell>
                      <TableCell>
                        {r.amount
                          ? money(r.amount, r.currency || 'INR')
                          : r.cost
                            ? money(Math.round(Number(r.cost) * 100), 'INR')
                            : '—'}
                      </TableCell>
                    </>
                  )}
                  {['deadlines', 'ageing'].includes(config.mode || '') && (
                    <TableCell>
                      {config.mode === 'ageing' ? (
                        age(r) + ' days'
                      ) : (
                        <span
                          className={
                            due(r) && due(r) < today() ? 'op-overdue' : ''
                          }
                        >
                          {due(r) || 'Not set'}
                        </span>
                      )}
                    </TableCell>
                  )}
                  {config.mode === 'tax' &&
                    ['gst', 'tcs', 'tds'].map((k) => (
                      <TableCell key={k}>
                        {money(
                          (r.lines || []).reduce(
                            (s: number, l: any) => s + (l[k] || 0),
                            0,
                          ),
                          r.currency || 'INR',
                        )}
                      </TableCell>
                    ))}
                  <TableCell>
                    {['documents', 'generated'].includes(config.mode || '') ? (
                      <a
                        className="text-link"
                        href={'/api/v1/operations/documents/' + r.id}
                        download
                      >
                        Download
                      </a>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => go(r.kind + '?record=' + r.id)}
                      >
                        Open <ArrowUpRight size={14} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Blank
            title="No matching records"
            detail="Saved operational records will appear in this report."
          />
        )}
        <footer className="op-pagination">
          {rows.length} records · FY {fy}
        </footer>
      </section>
    </div>
  );
}
export function OperationHub({
  group,
  go,
}: {
  group: string;
  go: (r: string) => void;
}) {
  return (
    <div className="op-hub">
      {operationModules
        .filter((m) => m.group === group)
        .map((m) => (
          <button key={m.key} className="widget" onClick={() => go(m.key)}>
            <strong>{m.label}</strong>
            <ArrowUpRight size={18} />
          </button>
        ))}
    </div>
  );
}
