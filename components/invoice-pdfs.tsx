'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { api, Loading } from './erp-ui';
import { invoicePdfVersions, invoicePdfTypes } from '@/lib/invoice-pdfs';

export function InvoicePdfs({ record, canWrite, onClose, onGenerated }: {
  record: any; canWrite: boolean; onClose: () => void; onGenerated?: () => void;
}) {
  const [files, setFiles] = useState<any[]>([]);
  const [type, setType] = useState<string>(invoicePdfTypes[0]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    api('operations/documents').then(data => { if (live) setFiles(data); })
      .catch(e => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [record.id, revision]);
  const versions = invoicePdfVersions(files, record.id, type);
  const selected = versions.find(d => d.id === selectedId) || versions[0];
  const url = selected ? '/api/v1/operations/documents/' + encodeURIComponent(selected.id) : '';
  async function generate() {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api(`operations/${record.kind}/${record.id}/pdf`, { category: type });
      setSelectedId(result.id);
      setMessage('New PDF saved. Earlier versions are retained.');
      setRevision(v => v + 1);
      onGenerated?.();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => !open && !busy && onClose()}>
    <DialogContent className="invoice-pdf-window" showCloseButton={!busy}>
      <DialogTitle>Invoice PDFs · {record.reference || record.name}</DialogTitle>
      <DialogDescription>Preview and download a saved document, or generate a new draft from this record.</DialogDescription>
      <div className="invoice-pdf-toolbar">
        <label>Document<select disabled={busy} value={type} onChange={e => { setType(e.target.value); setSelectedId(''); setMessage(''); }}>
          {invoicePdfTypes.map(t => <option key={t}>{t}</option>)}
        </select></label>
        {versions.length > 0 && <label>Saved version<select disabled={busy} value={selected?.id || ''} onChange={e => setSelectedId(e.target.value)}>
          {versions.map(d => <option key={d.id} value={d.id}>Version {d.documentVersion || 1} · {d.status || 'Draft'} · {d.created ? new Date(d.created).toLocaleString('en-IN') : 'Date unavailable'}</option>)}
        </select></label>}
        {canWrite && <Button disabled={busy || loading} onClick={generate}>{busy ? 'Generating…' : versions.length ? 'Generate new version' : 'Generate PDF'}</Button>}
        {selected && <><a href={url} download>Download PDF</a><a href={url + '?preview=1'} target="_blank" rel="noreferrer">Open in new tab</a></>}
      </div>
      {error && <div role="alert" className="error-box">{error}<Button variant="outline" onClick={() => { setError(''); setRevision(v => v + 1); }}>Retry loading</Button></div>}
      {message && <p role="status">{message}</p>}
      {loading ? <Loading /> : selected ? <>
        <p className="invoice-pdf-metadata">{selected.filename} · {selected.status || 'Draft'} · {Math.ceil(Number(selected.size || 0) / 1024)} KB · Saved by {selected.uploadedBy || 'Unknown'}</p>
        <iframe key={selected.id} title={`${type} version ${selected.documentVersion || 1}`} src={url + '?preview=1'} className="invoice-pdf-preview" />
      </> : <div className="invoice-pdf-empty"><strong>No saved {type.toLowerCase()} PDF</strong><p>{canWrite ? 'Generate the first draft to preview it here.' : 'A user with document creation access must generate this PDF first.'}</p></div>}
    </DialogContent>
  </Dialog>;
}
