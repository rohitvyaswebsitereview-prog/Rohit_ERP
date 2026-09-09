import { createRequire } from 'node:module';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
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
  format: 'esm',
  platform: 'neutral',
  external: ['cloudflare:workers'],
  outfile: '.test-output/worker.mjs',
});
const mf = new Miniflare({
  modules: true,
  scriptPath: '.test-output/worker.mjs',
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
  let r = await call('records');
  check('Unauthenticated data is denied', () => assert.equal(r.status, 401));
  r = await call('setup', {
    name: 'Test Administrator',
    email: 'test@example.test',
    password: 'Test-only-long-password',
  });
  check('Local account setup', () => assert.equal(r.status, 200));
  cookie = r.cookie.split(';')[0];
  r = await call('masters');
  const catalogue = r.data;
  check('Masters catalogue contains eight categories and 28 items', () => {
    assert.equal(catalogue.length, 8);
    assert.equal(catalogue.flatMap((c) => c.items).length, 28);
    assert.deepEqual(
      catalogue.map((c) => c.label),
      [
        'Organisation',
        'Products & Packaging',
        'Business Partners',
        'Trade & Commercial',
        'Trade Licences',
        'Logistics',
        'Documents & Communication',
        'Operations',
      ],
    );
  });
  check('Masters omits speculative and application settings entries', () => {
    const labels = catalogue.flatMap((c) => c.items.map((i) => i.label));
    for (const label of [
      'Branches',
      'Financial Years',
      'Users',
      'User Roles',
      'Warehouses',
      'Salesperson',
      'Notification Templates',
    ])
      assert.ok(!labels.includes(label));
  });
  await build({
    entryPoints: ['lib/masters.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: '.test-output/masters.mjs',
  });
  const { searchMasters } = await import('../.test-output/masters.mjs');
  for (const [query, expected] of [
    ['shipping', ['Shipment Terms', 'Shipping Lines', 'Shipping Line Charges']],
    ['customer', ['Customers', 'Delivery Addresses']],
    ['licence', ['Advance Licence', 'EPCG Licence']],
    ['bank', ['Bank Details']],
    ['package', ['Packages', 'Package Types', 'Packaging Materials']],
    [
      '  SHIPPING  ',
      ['Shipment Terms', 'Shipping Lines', 'Shipping Line Charges'],
    ],
    ['nothing-matches', []],
  ])
    check('Master name search: ' + query, () =>
      assert.deepEqual(
        searchMasters(catalogue, query).flatMap((c) =>
          c.items.map((i) => i.label),
        ),
        expected,
      ),
    );
  r = await call('masters/company-information');
  check('Master destination identifies implemented record workspace', () => {
    assert.equal(r.status, 200);
    assert.equal(r.data.implemented, true);
  });
  r = await call('masters', undefined, '');
  check('Unauthenticated catalogue request is denied', () =>
    assert.equal(r.status, 401),
  );

  r = await call('setup', {
    name: 'Other',
    email: 'other@example.test',
    password: 'Test-only-long-password',
  });
  check('Setup cannot be repeated', () => assert.equal(r.status, 409));
  r = await call('login', {
    email: 'test@example.test',
    password: 'incorrect',
  });
  check('Incorrect login is rejected generically', () =>
    assert.equal(r.status, 401),
  );
  const customer = (
    await call('records/customers', { name: 'Test Customer', country: 'India' })
  ).data.id;
  const vendor = (
    await call('records/vendors', { name: 'Test Vendor', country: 'India' })
  ).data.id;
  const p = (
    await call('records/products', { name: 'Test Equipment', sku: 'TEST-001' })
  ).data.id;
  const w = (await call('records/warehouses', { name: 'Test Warehouse' })).data
    .id;
  const inv = (
    await call('records/invoices', {
      date: '2026-09-06',
      reference: 'TEST-INV',
      partnerId: customer,
      currency: 'INR',
      amount: '1234.56',
      dueDate: '2026-09-10',
    })
  ).data.id;
  r = await call(`records/invoices/${inv}/post`, {});
  check('Invoice posts successfully', () => assert.equal(r.status, 200));
  r = await call(`records/invoices/${inv}/post`, {});
  check('Duplicate posting is prevented', () => assert.equal(r.status, 409));
  r = await call(
    'dashboard?fy=2026%E2%80%9327&start=2026-04-01&end=2026-09-06',
  );
  check(
    'Dashboard reconciles with posted invoice in integer minor units',
    () => {
      assert.equal(r.data.totals[0].sales, 123456);
      assert.equal(r.data.totals[0].receivables, 123456);
    },
  );
  r = await call('records/journal', {
    date: '2026-09-06',
    reference: 'BAD-JOURNAL',
    currency: 'INR',
    lines: [
      { account: '1000', debit: 100, credit: 0 },
      { account: '3000', debit: 0, credit: 90 },
    ],
  });
  check('Unbalanced journal is rejected', () => assert.equal(r.status, 400));
  for (const account of ['toString', 'constructor', '__proto__']) {
    r = await call('records/journal', {
      date: '2026-09-06',
      reference: 'INVALID-ACCOUNT-' + account,
      currency: 'INR',
      lines: [
        { account, debit: 100, credit: 0 },
        { account: '3000', debit: 0, credit: 100 },
      ],
    });
    check('Unknown account is rejected: ' + account, () =>
      assert.equal(r.status, 400),
    );
  }
  r = await call('records/journal', {
    date: '2026-09-06',
    reference: 'UNSAFE-TOTAL',
    currency: 'INR',
    lines: [
      { account: '1000', debit: Number.MAX_SAFE_INTEGER, credit: 0 },
      { account: '1000', debit: 2, credit: 0 },
      { account: '3000', debit: 0, credit: Number.MAX_SAFE_INTEGER },
      { account: '3000', debit: 0, credit: 1 },
    ],
  });
  check('Rounding cannot make an oversized unbalanced journal pass', () =>
    assert.equal(r.status, 400),
  );
  const order = await call('records/orders', {
    date: '2026-09-06',
    reference: 'STAGE-CHECK',
    partnerId: customer,
    currency: 'INR',
    amount: '100',
    destination: 'Mumbai',
    totalStages: 3,
  });
  assert.equal(order.status, 201);
  for (const stage of [0, '', null, -1, 1.5, 4]) {
    r = await call(`records/orders/${order.data.id}/status`, {
      status: 'Confirmed',
      version: 1,
      stage,
    });
    check('Invalid order stage is rejected: ' + JSON.stringify(stage), () =>
      assert.equal(r.status, 400),
    );
  }
  r = await call(`records/orders/${order.data.id}/status`, {
    status: 'Confirmed',
    version: 1,
    stageName: '',
  });
  check('Blank stage description is rejected', () =>
    assert.equal(r.status, 400),
  );
  r = await call(`records/orders/${order.data.id}/status`, {
    status: 'Confirmed',
    version: 1,
  });
  check('Status-only update preserves existing progress', () =>
    assert.equal(r.status, 200),
  );
  r = await call('records');
  const updatedOrder = r.data.find((record) => record.id === order.data.id);
  check('Rejected updates leave order version and progress unchanged', () => {
    assert.equal(updatedOrder.version, 2);
    assert.equal(updatedOrder.stage, 1);
    assert.equal(updatedOrder.stageName, 'Order created');
  });
  r = await call(`records/orders/${order.data.id}/status`, {
    status: 'In Transit',
    version: 1,
    stage: 2,
  });
  check('Stale order updates are rejected', () => assert.equal(r.status, 409));
  r = await call('records/invoices', {
    date: '2026-02-30',
    reference: 'BAD-DATE',
    partnerId: customer,
    currency: 'INR',
    amount: '1',
  });
  check('Impossible dates are rejected', () => assert.equal(r.status, 400));
  r = await call('records/invoices', {
    date: '2026-09-06',
    reference: 'BAD-MONEY',
    partnerId: customer,
    currency: 'INR',
    amount: '1.234',
  });
  check('Excess decimal places are rejected', () =>
    assert.equal(r.status, 400),
  );
  r = await call('records/movements', {
    date: '2026-09-06',
    reference: 'RECEIPT',
    productId: p,
    warehouseId: w,
    direction: 'Receipt',
    quantity: 5,
    reason: 'Opening stock',
  });
  check('Stock receipt succeeds', () => assert.equal(r.status, 201));
  r = await call('records/movements', {
    date: '2026-09-06',
    reference: 'ISSUE',
    productId: p,
    warehouseId: w,
    direction: 'Issue',
    quantity: 6,
    reason: 'Issue',
  });
  check('Negative stock is prevented', () => assert.equal(r.status, 400));
  const issues = await Promise.all(
    [1, 2].map((n) =>
      call('records/movements', {
        date: '2026-09-06',
        reference: 'RACE-' + n,
        productId: p,
        warehouseId: w,
        direction: 'Issue',
        quantity: 4,
        reason: 'Concurrent issue',
      }),
    ),
  );
  check('Concurrent issues cannot overdraw stock', () =>
    assert.deepEqual(issues.map((x) => x.status).sort(), [201, 400]),
  );
  const sql = await mf.getD1Database('DB');
  await sql
    .prepare('INSERT INTO tenants VALUES (?,?)')
    .bind('other', 'Other tenant')
    .run();
  await sql
    .prepare(
      'INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES (?,?,?,?,?,?)',
    )
    .bind(
      'foreign-record',
      'other',
      'customers',
      'master',
      JSON.stringify({ name: 'PRIVATE FOREIGN NAME' }),
      new Date().toISOString(),
    )
    .run();
  r = await call('records');
  check('Tenant records are isolated', () =>
    assert.ok(!r.data.some((x) => x.id === 'foreign-record')),
  );
  r = await call('search?q=PRIVATE');
  check('Search enforces tenant boundaries', () =>
    assert.equal(r.data.length, 0),
  );
  r = await call('records/invoices', {
    date: '2026-09-06',
    reference: 'FOREIGN-REF',
    partnerId: 'foreign-record',
    currency: 'INR',
    amount: '10',
  });
  check('Foreign-tenant references are rejected', () =>
    assert.equal(r.status, 400),
  );
  await assert.rejects(() =>
    sql.prepare("UPDATE audit SET detail='tampered'").run(),
  );
  passed++;
  console.log('PASS Audit update trigger rejects tampering');
  await assert.rejects(() => sql.prepare('DELETE FROM audit').run());
  passed++;
  console.log('PASS Audit delete trigger rejects tampering');
  await call('users', {
    name: 'Viewer',
    email: 'viewer@example.test',
    password: 'Viewer-test-password',
    role: 'Viewer',
  });
  const v = await call('login', {
    email: 'viewer@example.test',
    password: 'Viewer-test-password',
  });
  const viewerCookie = v.cookie.split(';')[0];
  r = await call('records/customers', { name: 'Forbidden' }, viewerCookie);
  check('Viewer cannot write records', () => assert.equal(r.status, 403));
  await call('users', {
    name: 'Logistics',
    email: 'logistics@example.test',
    password: 'Logistics-test-password',
    role: 'Logistics',
  });
  const l = await call('login', {
    email: 'logistics@example.test',
    password: 'Logistics-test-password',
  });
  r = await call(
    'dashboard?fy=2026%E2%80%9327&start=2026-04-01&end=2026-09-06',
    undefined,
    l.cookie.split(';')[0],
  );
  check('Logistics role cannot read financial totals', () =>
    assert.deepEqual(r.data.totals, []),
  );
  r = await call('masters', undefined, l.cookie.split(';')[0]);
  check('Restricted master categories are hidden for Logistics', () => {
    assert.ok(
      !r.data.some(
        (c) => c.key === 'trade-licences' || c.key === 'organisation',
      ),
    );
    assert.ok(
      !r.data
        .flatMap((c) => c.items)
        .some((i) => i.key === 'vendors' || i.key === 'bank-details'),
    );
  });
  r = await call('masters/bank-details', undefined, l.cookie.split(';')[0]);
  check('Direct restricted master request is denied server-side', () =>
    assert.equal(r.status, 404),
  );
  const csrf = await mf.dispatchFetch(
    'http://localhost/api/v1/records/customers',
    {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ name: 'Forbidden' }),
    },
  );
  check('Cross-origin mutation is blocked', () =>
    assert.equal(csrf.status, 403),
  );
  async function opCreate(kind,body){const r=await call('operations/'+kind,body);assert.equal(r.status,201,JSON.stringify(r.data));return r.data.id;}
  async function opGet(kind,id){const r=await call(`operations/${kind}/${id}`);assert.equal(r.status,200,JSON.stringify(r.data));return r.data.record;}
  async function opStatus(kind,id,status){const rec=await opGet(kind,id);return call(`operations/${kind}/${id}/status`,{status,version:rec.version,reason:'Integration test action'});}
  const currencyId=await opCreate('master-currency',{name:'US Dollar',code:'USD',words:'US dollars'});
  const opCustomer=await opCreate('customers',{name:'Workflow customer',country:'India',email:'workflow@example.test'});
  const opVendor=await opCreate('vendors',{name:'Workflow vendor',country:'India'});
  const opWarehouse=await opCreate('warehouses',{name:'Workflow warehouse'});
  const opProduct=await opCreate('products',{name:'Lathe',sku:'LATHE-1'});
  const base={reference:'Q-TEST-1',date:'2026-09-09',dueDate:'2026-10-09',currencyId,partnerId:opCustomer,warehouseId:opWarehouse,lines:[{productId:opProduct,description:'Lathe',quantity:'2',rate:'100',gstRate:'18',tcsRate:'1',tdsRate:'2',charges:'5',roundOff:'-0.50'}]};
  const purchase=await opCreate('purchase-invoices',{...base,reference:'PUR-TEST-1',partnerId:opVendor,warehouseId:opWarehouse});
  r=await opStatus('purchase-invoices',purchase,'Posted');
  check('Purchase invoice posts stock value and tax liabilities',()=>assert.equal(r.status,200));
  const quotation=await opCreate('quotations',base);
  let opRecord=await opGet('quotations',quotation);
  check('Server calculates exact commercial amounts',()=>{assert.equal(opRecord.lines[0].basic,20000);assert.equal(opRecord.amount,23850);});
  r=await call(`operations/quotations/${quotation}/save`,{...base,version:1});
  check('Critical edits require reasons',()=>assert.equal(r.status,400));
  r=await opStatus('quotations',quotation,'Accepted');
  check('Quotation cannot skip the sent stage',()=>assert.equal(r.status,400));
  assert.equal((await opStatus('quotations',quotation,'Sent')).status,200);
  assert.equal((await opStatus('quotations',quotation,'Accepted')).status,200);
  opRecord=await opGet('quotations',quotation);
  r=await call(`operations/quotations/${quotation}/convert`,{version:opRecord.version,reason:'Accepted order',target:'proformas',reference:'PI-TEST-1'});
  check('Accepted quotation converts into a linked proforma',()=>assert.equal(r.status,201));
  const proforma=r.data.id;
  assert.equal((await opStatus('proformas',proforma,'Confirmed')).status,200);
  opRecord=await opGet('proformas',proforma);
  r=await call(`operations/proformas/${proforma}/convert`,{version:opRecord.version,reason:'Ready to invoice',target:'invoices',reference:'CI-TEST-1'});
  const commercial=r.data.id;
  check('Proforma converts into commercial invoice with preserved lines',()=>assert.equal(r.status,201));
  r=await opStatus('invoices',commercial,'Posted');
  check('Commercial invoice posts balanced tax and receivable entries',()=>assert.equal(r.status,200));
  r=await opStatus('invoices',commercial,'Posted');
  check('Duplicate operational posting is rejected',()=>assert.equal(r.status,400));
  r=await call(`records/invoices/${commercial}/post`,{});
  check('Legacy endpoints cannot mutate operational documents',()=>assert.notEqual(r.status,200));
  const receipt=await opCreate('receipts',{reference:'REC-TEST-1',date:'2026-09-09',currencyId,partnerId:opCustomer,invoiceId:commercial,amount:'100',bankReference:'BANK-TEST'});
  assert.equal((await opStatus('receipts',receipt,'Posted')).status,200);
  const excessive=await opCreate('receipts',{reference:'REC-TEST-2',date:'2026-09-09',currencyId,partnerId:opCustomer,invoiceId:commercial,amount:'200',bankReference:'BANK-TEST-2'});
  r=await opStatus('receipts',excessive,'Posted');
  check('Receipts cannot exceed the outstanding invoice balance',()=>assert.equal(r.status,400));
  r=await opStatus('invoices',commercial,'Reversed');
  check('Invoice reversal is blocked while dependent receipts exist',()=>assert.equal(r.status,400));
  assert.equal((await opStatus('receipts',receipt,'Reversed')).status,200);
  assert.equal((await opStatus('receipts',excessive,'Cancelled')).status,200);
  r=await opStatus('invoices',commercial,'Reversed');
  check('Invoice reversal succeeds after dependent receipts are resolved',()=>assert.equal(r.status,200));
  const machine=await opCreate('machines',{name:'Lathe serial',serialNumber:'any / serial #1',productId:opProduct,warehouseId:opWarehouse});
  r=await call('operations/machines',{name:'Duplicate',serialNumber:'any / serial #1',productId:opProduct,warehouseId:opWarehouse});
  check('Machine serials are unique without grammar restrictions',()=>assert.equal(r.status,409));
  r=await call(`operations/machines/${machine}/document`,{filename:'inspection.txt',mime:'text/plain',category:'Inspection report',content:btoa('Inspected and accepted.'),status:'Final'});
  check('Entity document upload persists file metadata and content',()=>assert.equal(r.status,201));
  const documentId=r.data.id;
  const downloaded=await mf.dispatchFetch(`http://localhost/api/v1/operations/documents/${documentId}`,{headers:{Cookie:cookie}});
  check('Authorised file download returns original bytes',()=>assert.equal(downloaded.status,200));
  assert.equal(await downloaded.text(),'Inspected and accepted.');
  r=await call('operations/data',undefined,'');
  check('All operational data requires authentication',()=>assert.equal(r.status,401));

  r = await call('logout', {});
  r = await call('records');
  check('Logout revokes the session', () => assert.equal(r.status, 401));
  console.log(
    `\n${passed} integration checks passed. Database is disposable; local workspace was not changed.`,
  );
} finally {
  await mf.dispose();
  await rm('.test-output', { recursive: true, force: true });
}
