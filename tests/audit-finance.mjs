import assert from 'node:assert/strict';
import { dashboard } from '../lib/domain.ts';

const invoice = {id:'invoice',kind:'invoices',date:'2026-04-01',dueDate:'2026-04-30',amount:10000,currency:'INR',status:'Reversed'};
const posting = {id:'invoice-posting',kind:'journal',sourceId:'invoice',date:'2026-04-01',currency:'INR',status:'Posted',lines:[{account:'1100',debit:10000,credit:0},{account:'4000',debit:0,credit:10000}]};
const reversal = {...posting,id:'invoice-reversal',date:'2026-10-10',lines:posting.lines.map(l=>({...l,debit:l.credit,credit:l.debit}))};
let count=0;
function check(name,fn){fn();count++;console.log('PASS',name)}
const records = [invoice,posting,reversal];
check('An October reversal does not remove an April invoice from September ageing',()=>{
  const d=dashboard(records,'2026-04-01','2026-09-30');
  assert.equal(d.totals[0].receivables,10000);
  assert.equal(d.receivables.length,1);
  assert.equal(d.receivables[0].outstanding,10000);
});
check('Effective invoice reversal removes both balance and ageing at its date',()=>{
  const d=dashboard(records,'2026-04-01','2026-10-10');
  assert.equal(d.totals[0].receivables,0);
  assert.equal(d.receivables.length,0);
});
check('Reversed receipt still reduces an earlier-date invoice before its reversal',()=>{
  const receipt={id:'receipt',kind:'receipts',invoiceId:'invoice',amount:4000,currency:'INR',date:'2026-05-01',status:'Reversed'};
  const receiptPosting={id:'receipt-posting',kind:'journal',sourceId:'receipt',date:'2026-05-01',currency:'INR',status:'Posted',lines:[{account:'1000',debit:4000,credit:0},{account:'1100',debit:0,credit:4000}]};
  const receiptReversal={...receiptPosting,id:'receipt-reversal',date:'2026-08-01',lines:receiptPosting.lines.map(l=>({...l,debit:l.credit,credit:l.debit}))};
  const rs=[{...invoice,status:'Posted'},posting,receipt,receiptPosting,receiptReversal];
  assert.equal(dashboard(rs,'2026-04-01','2026-07-31').receivables[0].outstanding,6000);
  assert.equal(dashboard(rs,'2026-04-01','2026-08-01').receivables[0].outstanding,10000);
});
check('A later posting does not enter an earlier report even if invoice date is earlier',()=>{
  const rs=[{...invoice,status:'Posted'}, {...posting,date:'2026-10-01'}];
  assert.equal(dashboard(rs,'2026-04-01','2026-09-30').receivables.length,0);
});
check('Missing inventory cost makes profit explicitly provisional',()=>{
  const d=dashboard([{...invoice,status:'Posted'},posting],'2026-04-01','2026-09-30');
  assert.equal(d.totals[0].costCoverage.complete,false);
  assert.deepEqual(d.totals[0].costCoverage.missingInvoiceIds,['invoice']);
  assert.equal(d.totals[0].margin,null);
});
check('A matching posted stock issue establishes invoice cost coverage',()=>{
  const rs=[{...invoice,status:'Posted',lines:[{productId:'p',quantity:2,basic:10000}]}, {...posting,lines:[...posting.lines,{account:'5000',debit:6000,credit:0},{account:'1200',debit:0,credit:6000}]}, {id:'issue',kind:'movements',sourceId:'invoice',productId:'p',quantity:2,stockValue:6000,currency:'INR',status:'Posted',direction:'Issue',operationStock:true,date:'2026-04-01'}];
  const d=dashboard(rs,'2026-04-01','2026-09-30');
  assert.equal(d.totals[0].costCoverage.complete,true);
  assert.equal(d.totals[0].margin,40);
});
console.log(`${count} audit finance checks passed.`);
