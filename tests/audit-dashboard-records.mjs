import assert from 'node:assert/strict';
import {dashboard} from '../lib/domain.ts';
const record=(id,kind,amount,extra={})=>({id,kind,amount,fy:'2026–27',date:'2026-04-10',status:'Imported',importLocked:true,currency:'INR',...extra});
const records=[
 record('export','invoices',999999,{totalUsd:120.50}),
 record('domestic','domestic-invoices',45000),
 record('purchase','purchase-invoices',8000),
 record('expense','expenses',700),
 record('receipt','receipts',3000,{currency:'USD',settledAmount:4000}),
 record('payment','payments',5000),
 record('draft','invoices',990000,{status:'Draft',importLocked:false}),
 record('cancelled','invoices',990000,{status:'Cancelled'}),
 record('future','invoices',990000,{date:'2026-11-01'}),
 record('previous','invoices',990000,{fy:'2025–26',date:'2026-03-31'}),
 record('undated','payments',5000,{date:null}),
];
const d=dashboard(records,'2026-04-01','2026-10-10');
assert.ok(d.recorded,'Historical imports must produce a recorded-business overview without posting journals');
const total=(metric,currency)=>d.recorded.totals.find(r=>r.metric===metric&&r.currency===currency)?.amount;
assert.equal(total('sales','USD'),12050,'Export original USD, never the INR tax value');
assert.equal(total('sales','INR'),45000);
assert.equal(total('purchases','INR'),8000);
assert.equal(total('expenses','INR'),700);
assert.equal(total('receipts','USD'),3000,'Cash received differs from settlement allocation');
assert.equal(total('payments','INR'),5000);
assert.equal(d.recorded.rows.length,6,'Exclude draft, cancelled, future, previous-year and undated records');
assert.equal(d.totals.length,0,'Never manufacture posted accounting entries from imported records');
const invalid=dashboard([record('missing','payments',null),record('blank','payments',''),record('zero','payments',0)],'2026-04-01','2026-10-10').recorded;
assert.deepEqual(invalid.rows.map(r=>r.id),['zero'],'Missing values must not be counted as recorded zero amounts');
assert.equal(invalid.excluded,2);
console.log('PASS recorded dashboard values, original currency, date/status exclusions and unchanged ledger');
