'use client';
import { businessMetrics, recordedBusiness } from '@/lib/domain';
import { Blank, money, dateLabel, exportCSV } from './erp-ui';
import { Button } from './ui/button';
import type { RecordData } from '@/lib/domain';

export function RecordedBusinessOverview({ data, go }: { data: ReturnType<typeof recordedBusiness>; go: (route: string, filter?: string) => void }) {
  return <section className="widget recorded-business">
    <div className="widget-head"><h2>Recorded business</h2><span>Imported history + posted documents</span></div>
    <p className="data-basis">Original currencies · Invoice values include recorded taxes where applicable. Export USD values exclude INR taxes. Drafts and cancelled records are excluded. These are document totals, not posted revenue, profit or bank balances.</p>
    <div className="kpi-grid">
      {businessMetrics.map(metric => {
        const totals = data.totals.filter(t => t.metric === metric.key);
        return <div className="kpi" key={metric.key}><span className="kpi-label">{metric.label}</span>
          {totals.length ? totals.sort((a,b)=>a.currency.localeCompare(b.currency)).map(t => <button className="text-link" key={t.currency} onClick={() => go('business-records?metric='+metric.key, t.currency)}>
            <strong>{money(t.amount,t.currency)}</strong><span>{t.currency} · {t.count} records →</span>
          </button>) : <span>No eligible records in this period</span>}
        </div>;
      })}
    </div>
    {data.excluded > 0 && <p role="status">{data.excluded} records with missing dates or invalid amounts/currencies are excluded. Review these in the source registers.</p>}
  </section>;
}

export function RecordedBusinessReport({records,fy,go,role}: {records: RecordData[]; fy: string; go: (route:string)=>void; role: string}) {
  if(role==='Logistics') return <Blank title="Access restricted" detail="Your role does not include financial reports." />;
  const params=new URLSearchParams(typeof window==='undefined'?'':window.location.search);
  const year=Number(fy.slice(0,4)), start=params.get('from')||`${year}-04-01`, end=params.get('to')||`${year+1}-03-31`;
  const metric=params.get('metric'), currency=params.get('currency');
  const data=recordedBusiness(records,start,end);
  const rows=data.rows.filter(r=>(!metric||r.metric===metric)&&(!currency||r.currency===currency));
  const totals=data.totals.filter(t=>(!metric||t.metric===metric)&&(!currency||t.currency===currency));
  return <section className="widget">
    <div className="widget-head"><h2>{businessMetrics.find(m=>m.key===metric)?.label || 'Recorded business'}</h2><Button variant="outline" onClick={()=>exportCSV(rows.map(r=>({reference:r.originalReference||r.reference,date:r.date,status:r.status,currency:r.currency,amount:r.amount/100})), 'recorded-business')}>Export CSV</Button></div>
    <p>{dateLabel(start)} – {dateLabel(end)} · Imported history + posted documents · Drafts excluded</p>
    <p>{totals.map(t=>`${t.currency} ${money(t.amount,t.currency)} · ${t.count} records`).join(' | ')}</p>
    {rows.length ? <div className="table-wrap"><table><thead><tr>{['Reference','Date','Status','Currency','Document value','Open'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.originalReference||r.reference||r.name}</td><td>{dateLabel(r.date)}</td><td>{r.status}</td><td>{r.currency}</td><td>{money(r.amount,r.currency)}</td><td><Button variant="outline" onClick={()=>go(r.kind+'?record='+encodeURIComponent(r.id))}>Open record</Button></td></tr>)}</tbody></table></div> : <Blank title="No matching records" detail="No imported or posted documents match this period and currency." />}
  </section>;
}
