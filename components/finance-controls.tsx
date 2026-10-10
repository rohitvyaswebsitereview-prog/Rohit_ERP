'use client';
import {useEffect,useState} from 'react';
import {api} from './erp-ui';
import {Button} from './ui/button';

export function FinanceControls({role,onChanged}: {role:string;onChanged?:()=>void}) {
  const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [year,setYear]=useState(String(new Date().getFullYear()+1)),[reason,setReason]=useState('');
  const load=()=>api('finance-controls').then(setData).catch(e=>setError(e.message));
  useEffect(()=>{load()},[]);
  async function change(body:any) {
    setBusy(true);setError('');
    try {await api('finance-controls',{...body,reason});await load();setReason('');onChanged?.();}
    catch(e:any){setError(e.message)} finally{setBusy(false)}
  }
  if (!['Admin','Finance','Viewer'].includes(role)) return null;
  return <section className="widget settings-card"><h2>Financial years and posting controls</h2>
    <p>Closing a year prevents new accounting entries dated in that year. Earlier balances remain visible. Only an administrator can close or reopen it, and every change keeps a reason.</p>
    {error && <p className="error-box" role="alert">{error}</p>}
    {!data ? <p>Loading financial years…</p> : <><div className="table-scroll"><table><thead><tr><th>Financial year</th><th>Dates</th><th>Posting</th><th>Action</th></tr></thead><tbody>
      {data.years.map((y:any)=><tr key={y.fy}><td>{y.fy}</td><td>{y.start_date} to {y.end_date}</td><td>{y.state}</td><td>{role==='Admin' && <Button variant="outline" disabled={busy || reason.trim().length<5} onClick={()=>change({action:y.state==='Closed'?'reopen':'close',fy:y.fy})}>{y.state==='Closed'?'Reopen year':'Close year'}</Button>}</td></tr>)}
    </tbody></table></div><p className="note">{data.basis} Closing does not certify accounts or create opening entries.</p>
    {role==='Admin' && <><label className="field"><span>Reason for the change (required)</span><textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)} placeholder="Explain the approved change" /></label>
      <div className="settings-row"><label>New year starting in April <input type="number" min="2000" max="2100" value={year} onChange={e=>setYear(e.target.value)} /></label><Button disabled={busy || reason.trim().length<5} onClick={()=>change({action:'create-year',startYear:Number(year)})}>Create year</Button></div>
      <div className="settings-row"><span>Different person must approve sensitive documents</span><Button variant="outline" disabled={busy || reason.trim().length<5} onClick={()=>change({action:'approval-policy',separateApprover:!data.controls.separateApprover})}>{data.controls.separateApprover?'Enabled — turn off':'Disabled — enable'}</Button></div>
      <p className="note">This rule applies to configured approval requests and posting thresholds. It requires another administrator for approval; it does not add an outside identity provider.</p>
    </>}</>}
  </section>;
}
