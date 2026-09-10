'use client';
import { useEffect, useState } from 'react';
import { api, Blank, Loading, money, today, exportCSV } from './erp-ui';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from './ui/table';
import { WorkbookTable } from '@/lib/workbook-reports';
const display = (value: any) =>
  value === null || value === undefined
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
export function WorkbookOverview({
  go,
  fy,
}: {
  go: (r: string) => void;
  fy: string;
}) {
  const [meta, setMeta] = useState<any>(null);
  const [reports, setReports] = useState<WorkbookTable[]>([]);
  useEffect(() => {
    api('workbook/reports?fy=' + encodeURIComponent(fy))
      .then((r) => setReports(r.tables || []))
      .catch(() => {});
  }, [fy]);
  useEffect(() => {
    api('workbook')
      .then(setMeta)
      .catch(() => {});
  }, []);
  if (!meta?.batchId) return null;
  const sum = (report: string, column: string) =>
    reports
      .find((r) => r.key === report)
      ?.rows.reduce((n, r) => n + Number(r[column] || 0), 0) || 0;
  return (
    <section className="widget workbook-overview">
      <div>
        <h3>Imported business data</h3>
        <p>
          {meta.sourceRowCount} source rows · {meta.sheets.length} sheets · FY{' '}
          {fy}. Historical records are available in the ERP registers.
          General-ledger opening balances still need reconciliation.
        </p>
      </div>
      <div className="workbook-headline-totals">
        <div>
          <small>Customer pending · USD</small>
          <strong>{money(sum('debtors-usd', 'pending'), 'USD')}</strong>
        </div>
        <div>
          <small>Supplier outstanding · INR</small>
          <strong>{money(sum('net-creditors', 'pending'), 'INR')}</strong>
        </div>
        <div>
          <small>IGST refund pending · INR</small>
          <strong>{money(sum('igst', 'pending'), 'INR')}</strong>
        </div>
      </div>
      <Button onClick={() => go('workbook-data')}>
        View balances & source data
      </Button>
    </section>
  );
}
export default function WorkbookData({
  fy,
  go,
}: {
  fy: string;
  go: (r: string) => void;
}) {
  const [meta, setMeta] = useState<any>(null),
    [error, setError] = useState(''),
    [mode, setMode] = useState('reports'),
    [tables, setTables] = useState<WorkbookTable[]>([]),
    [tableKey, setTableKey] = useState('debtors-usd'),
    [sheet, setSheet] = useState(0),
    [start, setStart] = useState(1),
    [source, setSource] = useState<any>(null),
    [query, setQuery] = useState(''),
    [asOf, setAsOf] = useState(today()),
    [page, setPage] = useState(0),
    [formula, setFormula] = useState<any>(null);
  useEffect(() => {
    api('workbook')
      .then(setMeta)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (mode !== 'reports') return;
    let live = true;
    setError('');
    api(`workbook/reports?fy=${encodeURIComponent(fy)}&asOf=${asOf}`)
      .then((r) => live && setTables(r.tables || []))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [fy, asOf, mode]);
  useEffect(() => {
    if (mode !== 'source') return;
    let live = true;
    setSource(null);
    api(
      `workbook/sheet?sheet=${sheet}&start=${start}&q=${encodeURIComponent(query)}`,
    )
      .then((r) => live && setSource(r))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [sheet, start, query, mode]);
  if (error && !meta)
    return (
      <div role="alert" className="error-box">
        {error}
      </div>
    );
  if (!meta) return <Loading />;
  if (!meta.batchId) return <Blank title="No workbook imported yet" />;
  const selected = tables.find((t) => t.key === tableKey) || tables[0],
    rows =
      selected?.rows.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
      ) || [];
  const issues = meta.issues.filter((i: any) =>
    JSON.stringify(i).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="workbook-workspace">
      <header className="sales-register-header">
        <div>
          <h2>Business data & reconciliation</h2>
          <p>
            {meta.filename} · {meta.cellCount.toLocaleString()} populated cells
            preserved · {meta.formulaCount.toLocaleString()} formulas
          </p>
        </div>
        <a className="text-link" href="/api/v1/workbook/download">
          Download original workbook
        </a>
      </header>
      <nav className="sales-status-filters">
        {[
          ['reports', 'Business reports'],
          ['source', 'Source sheets'],
          ['issues', 'Review issues'],
          ['coverage', 'Import coverage'],
        ].map(([k, l]) => (
          <button
            key={k}
            aria-pressed={mode === k}
            onClick={() => {
              setMode(k);
              setQuery('');
              setPage(0);
            }}
          >
            {l}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <div className="op-toolbar">
        <Input
          aria-label="Search workbook data"
          placeholder="Search records, cells or review issues…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        {mode === 'reports' && (
          <label>
            Invoice cutoff / ageing date{' '}
            <Input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </label>
        )}
      </div>
      {mode === 'reports' && (
        <>
          <p className="muted">Balances and stock status reflect the saved workbook snapshot. The selected date filters invoice dates and calculates age; it does not reconstruct historical payment or stock balances.</p>
          <label className="field">
            <span>Report · FY {fy}</span>
            <select
              value={selected?.key || ''}
              onChange={(e) => {
                setTableKey(e.target.value);
                setPage(0);
              }}
            >
              {tables.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <section className="widget workbook-report">
              <div className="sales-items-toolbar">
                <h3>{selected.title}</h3>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportCSV(
                      rows.map((r) =>
                        Object.fromEntries(
                          selected.columns.map((c) => [
                            c.label,
                            c.type === 'money'
                              ? Number(r[c.key] || 0) / 100
                              : (r[c.key] ?? ''),
                          ]),
                        ),
                      ),
                      selected.title,
                    )
                  }
                >
                  Export report
                </Button>
              </div>
              <p className="op-note">{selected.note}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    {selected.columns.map((c) => (
                      <TableHead key={c.key}>{c.label}</TableHead>
                    ))}
                    <TableHead>Record</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(page * 30, page * 30 + 30).map((r, i) => (
                    <TableRow key={i}>
                      {selected.columns.map((c) => (
                        <TableCell key={c.key}>
                          {c.type === 'money'
                            ? (Number(r[c.key] || 0) / 100).toLocaleString(
                                'en-IN',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                  style: 'decimal',
                                  useGrouping: true,
                                },
                              )
                            : display(r[c.key])}
                        </TableCell>
                      ))}
                      <TableCell>
                        {r.id && r.kind && (
                          <button
                            className="text-link"
                            onClick={() => go(r.kind + '?record=' + r.id)}
                          >
                            Open
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <footer className="op-pagination">
                <span>{rows.length} rows</span>
                <Button
                  variant="outline"
                  disabled={!page}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={(page + 1) * 30 >= rows.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </footer>
            </section>
          )}
        </>
      )}
      {mode === 'source' && (
        <>
          <label className="field">
            <span>Source sheet</span>
            <select
              value={sheet}
              onChange={(e) => {
                setSheet(Number(e.target.value));
                setStart(1);
                setFormula(null);
              }}
            >
              {meta.sheets.map((s: any) => (
                <option key={s.index} value={s.index}>
                  {s.name}
                  {s.state === 'hidden' ? ' (hidden in workbook)' : ''}
                </option>
              ))}
            </select>
          </label>
          {source?.sheet ? (
            <section className="widget workbook-report">
              <p className="op-note">
                {source.sheet.dimension} · Original saved values. Select a cell
                to inspect its value, formula, comment and format. Hidden source
                rows remain included.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    {Array.from({ length: source.sheet.maxColumn }, (_, i) => (
                      <TableHead key={i}>{columnName(i + 1)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {source.rows.map((r: any) => (
                    <TableRow key={r.row}>
                      <TableCell>{r.row}</TableCell>
                      {Array.from(
                        { length: source.sheet.maxColumn },
                        (_, i) => {
                          const c = r.cells.find(
                            (x: any) => x.column === i + 1,
                          );
                          return (
                            <TableCell key={i}>
                              <button
                                className="workbook-cell"
                                title={c?.address}
                                onClick={() =>
                                  setFormula(
                                    c || {
                                      address: columnName(i + 1) + r.row,
                                      cached: null,
                                    },
                                  )
                                }
                              >
                                {display(c?.cached)}
                              </button>
                            </TableCell>
                          );
                        },
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <footer className="op-pagination">
                <span>
                  Rows {start}–{Math.min(start + 29, source.sheet.maxRow)} ·{' '}
                  {query ? source.totalMatches + ' search matches' : ''}
                </span>
                <Button
                  variant="outline"
                  disabled={start === 1 || !!query}
                  onClick={() => setStart((n) => Math.max(1, n - 30))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={start + 30 > source.sheet.maxRow || !!query}
                  onClick={() => setStart((n) => n + 30)}
                >
                  Next
                </Button>
              </footer>
              {formula && (
                <div className="workbook-cell-detail">
                  <h3>
                    {source.sheet.name}!{formula.address}
                  </h3>
                  <p>Saved value: {display(formula.cached) || '(blank)'}</p>
                  <p>Number format: {formula.numberFormat || 'General'}</p>
                  {formula.type === 'f' && <pre>{display(formula.value)}</pre>}
                  {formula.comment && <p>Comment: {formula.comment}</p>}
                  {formula.hyperlink && (
                    <p>Source hyperlink: {formula.hyperlink}</p>
                  )}
                </div>
              )}
            </section>
          ) : (
            <Loading />
          )}
        </>
      )}
      {mode === 'issues' && (
        <section className="widget workbook-report">
          <p className="op-note">
            Source errors and unresolved business questions are preserved. No
            duplicate row, credit, unknown date or missing allocation was
            silently deleted or invented.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                {['Sheet / row', 'Issue', 'Details', ''].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues
                .slice(page * 30, page * 30 + 30)
                .map((i: any, n: number) => (
                  <TableRow key={n}>
                    <TableCell>
                      {i.sheet} · {i.row}
                    </TableCell>
                    <TableCell>{i.code.replaceAll('_', ' ')}</TableCell>
                    <TableCell>{i.detail}</TableCell>
                    <TableCell>
                      <button
                        className="text-link"
                        onClick={() => {
                          setSheet(
                            meta.sheets.find((s: any) => s.name === i.sheet)
                              .index,
                          );
                          setStart(i.row);
                          setMode('source');
                          setQuery('');
                        }}
                      >
                        Inspect source
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <footer className="op-pagination">
            <span>{issues.length} findings</span>
            <Button
              disabled={!page}
              variant="outline"
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              disabled={(page + 1) * 30 >= issues.length}
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </footer>
        </section>
      )}
      {mode === 'coverage' && (
        <section className="widget workbook-report">
          <h3>Import coverage</h3>
          <p>
            {meta.sourceRowCount} business source rows mapped. Source report
            rows were archived without creating duplicate transactions. Original
            files, formulas and business data remain local.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sheet</TableHead>
                <TableHead>Used range</TableHead>
                <TableHead>Cells</TableHead>
                <TableHead>Formulas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meta.sheets.map((s: any) => (
                <TableRow key={s.index}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.dimension}</TableCell>
                  <TableCell>{s.cellCount}</TableCell>
                  <TableCell>{s.formulaCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <h3>ERP records created</h3>
          <dl className="sales-overview">
            {Object.entries(meta.recordCounts).map(([k, v]) => (
              <div key={k}>
                <dt>{k.replaceAll('-', ' ')}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
          <p className="op-note">
            {meta.accountingStatus}. Missing opening balances, uncertain
            duplicates, shared cost allocations and source formula issues must
            be resolved before relying on a complete statutory or general-ledger
            position.
          </p>
        </section>
      )}
    </div>
  );
}
function columnName(n: number) {
  let s = '';
  while (n) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}
export function WorkbookRecord({
  record,
  back,
  go,
}: {
  record: any;
  back: () => void;
  go: (r: string) => void;
}) {
  const [source, setSource] = useState<any>(null),
    [error, setError] = useState('');
  useEffect(() => {
    api('workbook/record/' + record.id)
      .then(setSource)
      .catch((e) => setError(e.message));
  }, [record.id]);
  return (
    <section className="widget workbook-report">
      <button className="text-link" onClick={back}>
        ← Back to register
      </button>
      <header className="sales-document-header">
        <div>
          <h2>{record.originalReference || record.reference || record.name}</h2>
          <p>
            {record.customerName || record.sourceTransactionType || record.name}
          </p>
          <p>
            {record.date || 'Date not provided'} · {record.status}{' '}
            {record.sourceStatus ? ' · ' + record.sourceStatus : ''}
          </p>
        </div>
        {record.amount !== undefined && (
          <strong>{money(record.amount, record.currency || 'INR')}</strong>
        )}
      </header>
      <p className="op-note">
        Historical workbook record. Source values are preserved and locked
        against reposting. Amounts and references below come from the original
        rows; empty fields remain empty.
      </p>
      <Button variant="outline" onClick={() => go('workbook-data')}>
        Business reports & reconciliation
      </Button>
      {error && <p role="alert">{error}</p>}
      {record.amountDerived && (
        <p className="op-note">
          Payable was calculated from the source invoice value less recorded TDS
          because the source payable cell was blank.
        </p>
      )}
      {!!source?.related?.length && (
        <div className="sales-status-filters">
          {source.related.map((r: any) => (
            <button key={r.id} onClick={() => go(r.kind + '?record=' + r.id)}>
              {r.reference}
            </button>
          ))}
        </div>
      )}
      {!source && !error ? (
        <Loading />
      ) : (
        source?.rows.map((r: any) => (
          <details className="workbook-source-row" key={r.row} open>
            <summary>
              {source.source.sheet} · Row {r.row}
            </summary>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cell</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Saved value</TableHead>
                  <TableHead>Formula / source note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.cells.map((c: any) => (
                  <TableRow key={c.address}>
                    <TableCell>{c.address}</TableCell>
                    <TableCell>
                      {display(
                        source.headers.find((h: any) => h.column === c.column)
                          ?.cached,
                      )}
                    </TableCell>
                    <TableCell>{display(c.cached)}</TableCell>
                    <TableCell>
                      {c.type === 'f' && (
                        <details>
                          <summary>Formula</summary>
                          <pre>{display(c.value)}</pre>
                        </details>
                      )}
                      {c.comment}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        ))
      )}
    </section>
  );
}
