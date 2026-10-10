import { createRequire } from 'node:module';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName } from 'pdf-lib';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
const { Miniflare } = require('miniflare');
await mkdir('.test-output', { recursive: true });
await build({
  stdin: {
    contents:
      "import {handle} from './lib/server/service.ts';export default {fetch:handle};",
    resolveDir: process.cwd(),
  },
  bundle: true,
  mainFields: ['module', 'main'],
  format: 'esm',
  platform: 'neutral',
  external: ['cloudflare:workers'],
  outfile: '.test-output/audit-operations-worker.mjs',
});
const mf = new Miniflare({
  modules: true,
  scriptPath: '.test-output/audit-operations-worker.mjs',
  compatibilityDate: '2026-05-15',
  compatibilityFlags: ['nodejs_compat'],
  d1Databases: { DB: 'test-db' },
  r2Buckets: ['FILES'],
});
let cookie = '';
let passed = 0;
async function call(path, body, c = cookie) {
  const response = await mf.dispatchFetch('http://localhost/api/v1/' + path, {
    ...(body !== undefined
      ? {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
            Cookie: c,
            Origin: 'http://localhost',
          },
        }
      : { headers: { Cookie: c } }),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie'),
  };
}
function check(name, fn) {
  fn();
  passed++;
  console.log('PASS', name);
}
try {
  const setup=await call('setup',{name:'Audit admin',email:'audit@example.test',password:'Audit-only-long-password'});
  cookie=setup.cookie.split(';')[0];
  async function create(kind,body){const r=await call('operations/'+kind,body);assert.equal(r.status,201,JSON.stringify(r.data));return r.data.id;}
  async function status(kind,id,value){const get=await call(`operations/${kind}/${id}`);return call(`operations/${kind}/${id}/status`,{version:get.data.record.version,status:value,reason:'Audit isolated journey'});}
  const inr=await create('master-currency',{name:'Rupee',code:'INR',words:'rupees'});
  const usd=await create('master-currency',{name:'Dollar',code:'USD',words:'dollars'});
  const product=await create('products',{name:'Audit goods',sku:'AUDIT-1'});
  const warehouse=await create('warehouses',{name:'Audit warehouse'});
  const vendor=await create('vendors',{name:'Audit vendor',country:'India'});
  const customer=await create('customers',{name:'Audit customer',country:'USA'});
  const base={date:'2026-04-01',warehouseId:warehouse,lines:[{productId:product,description:'Audit goods',quantity:'3',rate:'100'}]};
  const purchase=await create('purchase-invoices',{...base,reference:'AUDIT-P',currencyId:inr,partnerId:vendor});
  assert.equal((await status('purchase-invoices',purchase,'Posted')).status,200);
  const sale=await create('invoices',{...base,reference:'AUDIT-S',currencyId:usd,partnerId:customer,lines:[{...base.lines[0],quantity:'2',rate:'5'}]});
  let r=await status('invoices',sale,'Posted');
  check('USD sale consumes physical goods purchased in INR',()=>assert.equal(r.status,200,JSON.stringify(r.data)));
  let stock=(await call('operations/stock')).data;
  check('Cross-currency sale leaves exactly one unit with original INR cost',()=>{assert.equal(stock.length,1);assert.equal(stock[0].quantity,1);assert.equal(stock[0].value,10000);assert.equal(stock[0].currency,'INR');});
  let records=(await call('records')).data;
  check('Foreign sale keeps cost in its original currency without inventing FX',()=>{const costs=records.filter(r=>r.kind==='journal'&&r.sourceId===sale&&r.currency==='INR');assert.equal(costs.length,1);assert.equal(costs[0].lines.find(l=>l.account==='5000').debit,20000);const sales=records.find(r=>r.id===sale+'-posting');assert.equal(sales.currency,'USD');assert.equal(sales.lines.find(l=>l.account==='4000').credit,1000);});
  r=await status('invoices',sale,'Reversed');
  check('Cross-currency sale reverses atomically',()=>assert.equal(r.status,200,JSON.stringify(r.data)));
  stock=(await call('operations/stock')).data;
  check('Reversal restores original physical quantity and valuation',()=>{assert.equal(stock.length,1);assert.equal(stock[0].quantity,3);assert.equal(stock[0].value,30000);});
  records=(await call('records')).data;
  check('Cross-currency cost journals net to zero after reversal',()=>{const net=records.filter(r=>r.kind==='journal'&&r.sourceId===sale&&r.currency==='INR').flatMap(r=>r.lines).filter(l=>l.account==='5000').reduce((s,l)=>s+l.debit-l.credit,0);assert.equal(net,0);});
  r=await call('finance-controls');
  check('Financial years are discoverable with lock state',()=>{assert.equal(r.status,200);assert.ok(r.data.years.some(y=>y.fy==='2026–27'));});
  r=await call('finance-controls',{action:'create-year',startYear:2027,reason:'Open new year'});
  check('Administrator can create next financial year',()=>assert.equal(r.status,200,JSON.stringify(r.data)));
  r=await call('finance-controls',{action:'close',fy:'2026–27',reason:'Audit period lock'});
  check('Administrator can lock an accounting period',()=>assert.equal(r.status,200,JSON.stringify(r.data)));
  const locked=await create('purchase-invoices',{...base,date:'2026-05-01',reference:'LOCKED',currencyId:inr,partnerId:vendor});
  r=await status('purchase-invoices',locked,'Posted');
  check('Closed period rejects posting atomically',()=>{assert.equal(r.status,400,JSON.stringify(r.data));assert.match(r.data.error,/closed|locked/i);});
  assert.equal((await call(`operations/purchase-invoices/${locked}`)).data.record.status,'Draft');
  r=await call('finance-controls',{action:'reopen',fy:'2026–27',reason:'Authorised correction'});
  check('Administrator can reopen with audit reason',()=>assert.equal(r.status,200,JSON.stringify(r.data)));
  r=await status('purchase-invoices',locked,'Posted');
  check('Reopened period accepts valid posting',()=>assert.equal(r.status,200,JSON.stringify(r.data)));
  console.log(passed+' audit operation checks passed.');
} finally { await mf.dispose(); await rm('.test-output/audit-operations-worker.mjs',{force:true}); }
