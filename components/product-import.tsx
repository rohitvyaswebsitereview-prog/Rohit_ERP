'use client';
import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { exportCSV } from './erp-ui';
import { opMap } from '@/lib/operations';
import { parseProductCSV } from '@/lib/product-csv';

export function ProductImport({ records }: { records: any[] }) {
  const [open,setOpen]=useState(false), [csv,setCSV]=useState<string[][]>([]), [mapping,setMapping]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [errors,setErrors]=useState<any[]>([]), [validated,setValidated]=useState(false), [done,setDone]=useState(false);
  const fields=opMap.products.fields;
  const rows=csv.slice(1).map(row=>Object.fromEntries(fields.map(f=>{
    let value=mapping[f.key] ? row[csv[0].indexOf(mapping[f.key])] || '' : '';
    if(f.source && value) {
      const matches=records.filter(r=>r.kind===f.source && [r.id,r.code,r.name].some(v=>String(v||'').toLowerCase()===value.toLowerCase()));
      if(matches.length===1)value=matches[0].id;
    }
    return [f.key,value];
  })));
  const run=async(preview:boolean)=>{
    setBusy(true);setMessage('');setErrors([]);
    try {
      const response=await fetch('/api/v1/operations/product-import',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows,preview})});
      const result:any=await response.json();
      if(result.errors?.length){setErrors(result.errors);setValidated(false);return;}
      if(!response.ok)throw new Error(result.error||'Import failed.');
      if(preview){setValidated(true);setMessage(`${result.valid} valid rows; ${result.existing} already imported.`);}
      else {setDone(true);setMessage(`${result.imported} products imported; ${result.existing} existing products retained.`);}
    }catch(e:any){setMessage(e.message);}finally{setBusy(false);}
  };
  return <><Button variant="outline" onClick={()=>setOpen(true)}>Import CSV</Button><Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}><DialogContent className="product-import-dialog"><DialogTitle>Import products</DialogTitle><DialogDescription>Download template → Upload → Map columns → Validate → Import. Up to 200 products and 500 KB. Any invalid row prevents the entire import.</DialogDescription>
    <Button variant="outline" onClick={()=>exportCSV([{name:'Sample product',sku:'SAMPLE-001',unitId:'NOS',brand:'',hsn:'',weight:'',grossWeight:'',defaultRate:'',gstRate:''}],'Product import template')}>Download template</Button>
    <label>Upload CSV<input type="file" accept=".csv,text/csv" disabled={busy} onChange={async e=>{
      setValidated(false);setDone(false);setErrors([]);setMessage('');setCSV([]);
      try{const file=e.target.files?.[0];if(!file)return;if(!file.name.toLowerCase().endsWith('.csv')||file.size>500000)throw new Error('Choose a CSV file up to 500 KB.');
        const parsed=parseProductCSV(await file.text());setCSV(parsed);setMapping(Object.fromEntries(fields.map(f=>[f.key,parsed[0].find(h=>h.toLowerCase()===f.key.toLowerCase())||''])));
      }catch(err:any){setMessage(err.message);}
    }}/></label>
    {!!csv.length && <><div className="product-import-mapping">{fields.map(f=><label key={f.key}>{f.label}{f.required?' *':''}<select disabled={busy||done} value={mapping[f.key]||''} onChange={e=>{setMapping({...mapping,[f.key]:e.target.value});setValidated(false);setErrors([]);}}><option value="">Not mapped</option>{csv[0].map(h=><option key={h}>{h}</option>)}</select></label>)}</div>
      <p>Units and tax codes accept an existing name, code, or ID. Preview: first 10 of {rows.length} rows.</p>
      <div className="shipzy-table-scroll"><table><thead><tr><th>CSV row</th><th>Name</th><th>SKU</th></tr></thead><tbody>{rows.slice(0,10).map((r,i)=><tr key={i}><td>{i+2}</td><td>{r.name}</td><td>{r.sku}</td></tr>)}</tbody></table></div>
      {!done && <Button disabled={busy} onClick={()=>run(!validated)}>{busy?'Processing…':validated?'Import all validated rows':'Validate all rows'}</Button>}
    </>}
    {!!errors.length && <div role="alert"><p>{errors.length} invalid rows. No products imported.</p><Button variant="outline" onClick={()=>exportCSV(errors,'Product import errors')}>Download errors</Button><ul>{errors.map(e=><li key={e.row}>Row {e.row}: {e.error}</li>)}</ul></div>}
    {message && <p role="status">{message}</p>}{done && <Button onClick={()=>window.location.reload()}>Refresh product list</Button>}
  </DialogContent></Dialog></>;
}
