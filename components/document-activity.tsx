'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Blank } from './erp-ui';

export function DocumentActivity({ data, go }: { data: any; go: (route: string) => void }) {
  const [audit, setAudit] = useState(false);
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [audit, query, actor, action, from, to]);
  const source = audit ? data.audit || [] : data.timeline || [];
  const invalidDates = !!from && !!to && from > to;
  const rows = source.filter((entry: any) => {
    const date = String(entry.created || entry.date || '').slice(0, 10);
    return (!from || date >= from) && (!to || date <= to) &&
      (!audit || !actor || (entry.actor || 'System') === actor) &&
      (!action || (entry.action || entry.label) === action) &&
      [entry.action, entry.label, entry.actor, entry.reference, entry.record_id, entry.recordId].join(' ').toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a: any, b: any) => String(b.created || b.date).localeCompare(String(a.created || a.date)));
  return <div className="shipzy-audit">
    <div className="op-document-filters">
      <Button variant={!audit ? 'default' : 'outline'} aria-pressed={!audit} onClick={() => { setAudit(false); setAction(''); }}>Transaction timeline</Button>
      {!!data.audit?.length && <Button variant={audit ? 'default' : 'outline'} aria-pressed={audit} onClick={() => { setAudit(true); setAction(''); }}>Audit history</Button>}
    </div>
    <p>{audit ? 'Recorded user and system actions.' : 'Business dates and expected milestones; these are not user action timestamps.'}</p>
    <div className="op-document-filters">
      <Input aria-label="Search activity" placeholder="Search activity or reference…" value={query} onChange={e => setQuery(e.target.value)} />
      {audit && <label>User <select value={actor} onChange={e => setActor(e.target.value)}><option value="">All users</option>{[...new Set<string>(source.map((e: any) => e.actor || 'System'))].map(a => <option key={a}>{a}</option>)}</select></label>}
      <label>Action <select value={action} onChange={e => setAction(e.target.value)}><option value="">All actions</option>{[...new Set<string>(source.map((e: any) => e.action || e.label).filter(Boolean))].map(a => <option key={a}>{a}</option>)}</select></label>
      <label>From <Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label>To <Input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <Button variant="outline" onClick={() => { setQuery(''); setActor(''); setAction(''); setFrom(''); setTo(''); }}>Clear filters</Button>
    </div>
    {invalidDates ? <p className="error-box" role="alert">The end date must be on or after the start date.</p> : <>
      {rows.slice(page * 25, page * 25 + 25).map((entry: any, index: number) => {
        const id = entry.record_id || entry.recordId;
        const record = (data.records || []).find((r: any) => r.id === id);
        return <article key={entry.id || index}><i /><div>
          <strong>{entry.action || entry.label || 'Record activity'}</strong>
          <p>{record ? <button className="text-link" onClick={() => go(record.kind + '?record=' + encodeURIComponent(id))}>{record.reference || record.name || entry.reference || id}</button> : entry.reference || id}</p>
          <small>{entry.created || entry.date}{audit ? ' · ' + (entry.actor || 'System') : ' · ' + (entry.evidence || 'Recorded milestone')}</small>
          {audit && entry.detail && <details><summary>Action details</summary><pre className="activity-metadata">{formatMetadata(entry.detail)}</pre></details>}
        </div></article>;
      })}
      {!rows.length && <Blank title="No activity matches these filters" />}
      <div className="op-document-filters"><span role="status">{rows.length} entries</span><Button variant="outline" disabled={!page} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * 25 >= rows.length} onClick={() => setPage(p => p + 1)}>Next</Button></div>
    </>}
  </div>;
}
function formatMetadata(value: unknown) {
  try { return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2); }
  catch { return String(value); }
}
