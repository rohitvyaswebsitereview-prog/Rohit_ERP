'use client';
import { useState } from 'react';
import Dashboard from './dashboard';
import { dashboardPeriod, dashboardPeriods } from '@/lib/dashboard-period';
import { Button } from './ui/button';
export function ManagementDashboard({ records, fy, role, revision, go, refresh, updatedAt }: any) {
  const [period, setPeriod] = useState('This Financial Year');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const range = dashboardPeriod(fy, period, today, from, to);
  function drill(route: string, filter?: string) {
    const [base, existing = ''] = route.split('?');
    const params = new URLSearchParams(existing);
    params.set('from', range.start); params.set('to', range.end); params.set('fy', fy);
    if (['receivables','payables'].includes(base)) { params.delete('from'); params.set('basis','posted'); params.set('asOf',range.end); params.set('outstanding','1'); }
    if (params.get('ageing') === 'Due date missing') params.set('ageing','No due date');
    if (filter && /^[A-Z]{3}$/.test(filter)) params.set('currency', filter);
    else if (filter) params.set('filter', filter);
    go(base + '?' + params);
  }
  return <div className="management-dashboard">
    <div className="dashboard-context"><div><h2>Dashboard</h2><span>FY {fy}</span></div>
      <label>Period<select value={period} onChange={e => setPeriod(e.target.value)}>{dashboardPeriods.map(p => <option key={p}>{p}</option>)}</select></label>
      {period === 'Custom Period' && <><label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label></>}
      <Button variant="outline" onClick={refresh}>Refresh</Button><small>{updatedAt ? 'Updated ' + new Date(updatedAt).toLocaleString('en-IN') : 'Loading data…'}</small>
    </div>
    {range.valid ? <Dashboard fy={fy} start={range.start} end={range.end} revision={revision} records={records} role={role} go={drill} /> : <p className="error-box" role="alert">Select a valid date range within FY {fy}.</p>}
  </div>;
}
