'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api, Loading, Blank } from './erp-ui';
import { useDataView } from './data-view';
import { useWorkspaces, transactionLink } from './process-workspace';
export default function DocumentCenter({
  fy,
  records,
  go,
  inbox = false,
}: {
  fy: string;
  records: any[];
  go: any;
  inbox?: boolean;
}) {
  const { includes } = useDataView(),
    workspace = useWorkspaces(fy);
  const [files, setFiles] = useState<any[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true),
    [q, setQ] = useState(
      typeof window === 'undefined'
        ? ''
        : new URLSearchParams(window.location.search).get('category') || '',
    ),
    [status, setStatus] = useState(inbox ? 'Pending' : 'All'),
    [selected, setSelected] = useState(''),
    [page, setPage] = useState(0),
    [audit, setAudit] = useState<any[]>([]);
  useEffect(() => {
    let live = true;
    api('operations/documents')
      .then((d) => live && setFiles(d))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => setPage(0), [q, status, fy]);
  const ids = new Set(
    records
      .filter((r) => (r.fy === fy || r.fy === 'master') && includes(r))
      .map((r) => r.id),
  );
  const uploaded = files
    .filter((f) => ids.has(f.entityId))
    .map((f) => ({
      ...f,
      title: f.filename,
      transaction: records.find((r) => r.id === f.entityId),
      status:
        f.expiryDate && f.expiryDate < new Date().toISOString().slice(0, 10)
          ? 'Expired'
          : f.status || 'Draft',
    }));
  const missing = workspace.rows
    .filter((r) => r.kind === 'invoices')
    .flatMap((r) =>
      r.stages.flatMap((s: any) =>
        s.checks
          .filter(
            (c: any) =>
              !c.complete &&
              [
                'Shipping bill',
                'Bill of lading',
                'Packing list',
                'eBRC',
              ].includes(c.key),
          )
          .map((c: any) => ({
            id: r.id + '|' + c.key,
            title: c.label,
            category: c.label,
            entityId: r.id,
            transaction: r,
            status: 'Pending',
            missing: true,
          })),
      ),
    );
  const rows = [...uploaded, ...missing].filter(
    (d) =>
      (status === 'All' ||
        d.status === status ||
        (status === 'Submitted' && d.status === 'Sent')) &&
      JSON.stringify(d).toLowerCase().includes(q.toLowerCase()),
  );
  const doc = [...uploaded, ...missing].find((d) => d.id === selected);
  useEffect(() => {
    let live = true;
    setAudit([]);
    if (doc && !doc.missing)
      api('relationships/' + encodeURIComponent(doc.entityId))
        .then((d) => live && setAudit(d.audit || []))
        .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [selected]);
  if (busy || workspace.loading) return <Loading />;
  if (error || workspace.error)
    return (
      <div className="error-box">
        {error || workspace.error}
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  if (doc)
    return (
      <div className="document-viewer">
        <header>
          <Button variant="outline" onClick={() => setSelected('')}>
            ← Documents
          </Button>
          <h2>{doc.title}</h2>
          <span>{doc.status}</span>
        </header>
        <div className="document-viewer-body">
          <section>
            {doc.missing ? (
              <Blank
                title="Document awaited"
                detail="Open the transaction to create or upload this document."
              />
            ) : doc.mime === 'application/pdf' ? (
              <iframe
                title={doc.title}
                src={
                  '/api/v1/operations/documents/' + encodeURIComponent(doc.id)
                }
              />
            ) : doc.mime?.startsWith('image/') ? (
              <img
                alt={doc.title}
                src={
                  '/api/v1/operations/documents/' + encodeURIComponent(doc.id)
                }
              />
            ) : (
              <p>This file is available to download.</p>
            )}
            {!doc.missing && (
              <a
                className="text-link"
                href={
                  '/api/v1/operations/documents/' + encodeURIComponent(doc.id)
                }
              >
                Download original file
              </a>
            )}
          </section>
          <aside>
            <h3>Document information</h3>
            <dl className="key-information">
              {[
                ['Category', doc.category],
                ['Status', doc.status],
                ['Version', doc.documentVersion || doc.version || '—'],
                ['Created', doc.created || '—'],
                [
                  'Customer',
                  doc.transaction?.party ||
                    doc.transaction?.customerName ||
                    '—',
                ],
                ['Transaction', doc.transaction?.reference || '—'],
                ['Expiry', doc.expiryDate || 'Not recorded'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <Button
              onClick={() => go(transactionLink(doc.entityId, 'Documents'))}
            >
              Open transaction documents
            </Button>
            <details>
              <summary>Approval & audit history</summary>
              {audit.length ? (
                audit.slice(0, 30).map((a: any) => (
                  <p key={a.id}>
                    {a.action} · {a.actor} · {a.created}
                  </p>
                ))
              ) : (
                <p>
                  No recorded approval or audit events available to your role.
                </p>
              )}
            </details>
            <Button
              variant="ghost"
              onClick={() => go(transactionLink(doc.entityId, 'Transactions'))}
            >
              Customer & shipment links
            </Button>
          </aside>
        </div>
      </div>
    );
  return (
    <div className="document-center">
      <div className="op-toolbar">
        <Input
          aria-label="Search documents"
          placeholder="Search document, transaction or customer…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => go('master-document-templates')}
        >
          Templates
        </Button>
      </div>
      <nav className="simple-tabs" aria-label="Document status">
        {['All', 'Pending', 'Submitted', 'Approved', 'Expired'].map((s) => (
          <button
            key={s}
            aria-current={status === s ? 'page' : undefined}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </nav>
      <div className="simple-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Document</th>
              <th>Transaction</th>
              <th>Category</th>
              <th>Status</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 25, page * 25 + 25).map((d) => (
              <tr key={d.id}>
                <td>
                  <button
                    className="text-link"
                    onClick={() => setSelected(d.id)}
                  >
                    {d.title}
                  </button>
                </td>
                <td>
                  <button
                    className="text-link"
                    onClick={() => go(transactionLink(d.entityId))}
                  >
                    {d.transaction?.reference || 'Open record'}
                  </button>
                </td>
                <td>{d.category}</td>
                <td>{d.status}</td>
                <td>{d.missing ? '—' : d.documentVersion || d.version || 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <Blank
          title="No matching documents"
          detail="Select another status or data view."
        />
      )}
      <footer className="simple-panel-foot">
        <span>{rows.length} documents</span>
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
      </footer>
    </div>
  );
}
