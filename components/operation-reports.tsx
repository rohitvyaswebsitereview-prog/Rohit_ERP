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
import { taxWorkingRows } from '@/lib/audit-presentation';
import OperationStock from './operation-stock';
import { reportRoutes } from '@/lib/report-routes';
export { reportRoutes } from '@/lib/report-routes';

export function documentReportScope(files: any[], data: any[], route: string, fy: string) {
  const entities = new Map(data.map(r => [r.id, r]));
  const exportKinds = new Set(['invoices', 'orders', 'sales-orders', 'quotations', 'proformas', 'shipping-bills', 'bills-of-lading', 'shipments', 'ebrc', 'incentives']);
  const importKinds = new Set(['import-orders', 'bill-of-entry', 'customs', 'import-costs', 'import-settlements']);
  const domain = (entity: any): string => {
    const seen = new Set<string>();
    let current = entity;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (current.kind === 'domestic-invoices') return 'domestic';
      if (exportKinds.has(current.kind)) return 'export';
      if (importKinds.has(current.kind)) return 'import';
      current = entities.get(current.sourceId || current.invoiceId || current.orderId);
    }
    return '';
  };
  let unscopedCount = 0, masterCount = 0;
  const rows = files.filter(file => {
    const entity = entities.get(file.entityId);
    const master = !!entity && !!opMap[entity.kind]?.master;
    if (!entity || (!master && !/^\d{4}–\d{2}$/.test(entity.fy || ''))) {
      unscopedCount++;
      return false;
    }
    if (!master && entity.fy !== fy) return false;
    if (route === 'documents-generated-documents' && file.generated !== true) return false;
    if (route === 'documents-uploaded-documents' && file.generated === true) return false;
    if (route === 'documents-transaction-documents' && master) return false;
    if (['documents-export-documents', 'sales-export-documents'].includes(route) && domain(entity) !== 'export') return false;
    if (route === 'documents-domestic-documents' && domain(entity) !== 'domestic') return false;
    if (route === 'import-import-documents' && domain(entity) !== 'import') return false;
    if (master) masterCount++;
    return true;
  });
  return { rows, unscopedCount, masterCount };
}
export function OperationReports(props: {
  route: string;
  fy: string;
  go: (r: string) => void;
}) {
  if (reportRoutes[props.route]?.mode === 'valuation') return <OperationStock valuation />;
  return <ReportTable {...props} />;
}

function ReportTable({
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
  const documentScope = ['documents', 'generated'].includes(config.mode || '')
    ? documentReportScope(files, data, route, fy)
    : null;
  let rows = documentScope
    ? documentScope.rows
    : data.filter(
        (r) =>
          (!config.kinds || config.kinds.includes(r.kind)) &&
          (opMap[r.kind]?.master || r.fy === fy),
      );
  if (config.mode === 'pending-tasks')
    rows = rows.filter((r) => !['Completed', 'Cancelled'].includes(r.status));
  if (config.mode === 'completed-tasks')
    rows = rows.filter((r) => r.status === 'Completed');
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
  if (config.mode === 'tax' && status === 'All') rows = taxWorkingRows(rows);
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
      {documentScope && <p className="op-note" role="status">
        Files follow the linked transaction’s financial year, regardless of upload date. Missing required files are tracked in the document checklist.
        {documentScope.unscopedCount > 0 && ` ${documentScope.unscopedCount} file(s) excluded because their transaction link or financial year is unavailable; no year is inferred from upload dates.`}
        {documentScope.masterCount > 0 && ` ${documentScope.masterCount} master file(s) are shared across financial years.`}
      </p>}
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
        {config.mode === 'tax' && <p className="op-note">Posted documents only by default. This is a working register for review; it is not a filed tax return. Select another status to inspect unposted records.</p>}
        {(route.startsWith('costing-') || route === 'reports-costing-reports') && <p className="op-note">Working list of entered costing sheets. These figures are not reconciled to posted purchases, freight, bank charges or exchange differences; review each source before using a margin.</p>}
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
