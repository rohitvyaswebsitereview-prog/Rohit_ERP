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
  async function opCreate(kind, body) {
    const r = await call('operations/' + kind, body);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data.id;
  }
  async function opGet(kind, id) {
    const r = await call(`operations/${kind}/${id}`);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data.record;
  }
  async function opStatus(kind, id, status) {
    const rec = await opGet(kind, id);
    return call(`operations/${kind}/${id}/status`, {
      status,
      version: rec.version,
      reason: 'Integration test action',
    });
  }
  const currencyId = await opCreate('master-currency', {
    name: 'US Dollar',
    code: 'USD',
    words: 'US dollars',
  });
  const opCustomer = await opCreate('customers', {
    name: 'Workflow customer',
    country: 'India',
    email: 'workflow@example.test',
  });
  const opVendor = await opCreate('vendors', {
    name: 'Workflow vendor',
    country: 'India',
  });
  const opWarehouse = await opCreate('warehouses', {
    name: 'Workflow warehouse',
  });
  const opProduct = await opCreate('products', {
    name: 'Lathe',
    sku: 'LATHE-1',
  });
  const base = {
    reference: 'Q-TEST-1',
    date: '2026-09-09',
    dueDate: '2026-10-09',
    currencyId,
    partnerId: opCustomer,
    warehouseId: opWarehouse,
    lines: [
      {
        productId: opProduct,
        description: 'Lathe',
        quantity: '2',
        rate: '100',
        gstRate: '18',
        tcsRate: '1',
        tdsRate: '2',
        charges: '5',
        roundOff: '-0.50',
      },
    ],
  };
  const purchase = await opCreate('purchase-invoices', {
    ...base,
    reference: 'PUR-TEST-1',
    partnerId: opVendor,
    warehouseId: opWarehouse,
  });
  r = await opStatus('purchase-invoices', purchase, 'Posted');
  check('Purchase invoice posts stock value and tax liabilities', () =>
    assert.equal(r.status, 200, JSON.stringify(r.data)),
  );
  const quotation = await opCreate('quotations', base);
  let opRecord = await opGet('quotations', quotation);
  check('Server calculates exact commercial amounts', () => {
    assert.equal(opRecord.lines[0].basic, 20000);
    assert.equal(opRecord.amount, 23850);
  });
  r = await call(`operations/quotations/${quotation}/save`, {
    ...base,
    version: 1,
  });
  check('Critical edits require reasons', () => assert.equal(r.status, 400));
  r = await opStatus('quotations', quotation, 'Accepted');
  check('Quotation cannot skip the sent stage', () =>
    assert.equal(r.status, 400),
  );
  assert.equal((await opStatus('quotations', quotation, 'Sent')).status, 200);
  assert.equal(
    (await opStatus('quotations', quotation, 'Accepted')).status,
    200,
  );
  opRecord = await opGet('quotations', quotation);
  r = await call(`operations/quotations/${quotation}/convert`, {
    version: opRecord.version,
    reason: 'Accepted order',
    target: 'proformas',
    reference: 'PI-TEST-1',
  });
  check('Accepted quotation converts into a linked proforma', () =>
    assert.equal(r.status, 201),
  );
  const proforma = r.data.id;
  assert.equal(
    (await opStatus('proformas', proforma, 'Confirmed')).status,
    200,
  );
  opRecord = await opGet('proformas', proforma);
  r = await call(`operations/proformas/${proforma}/convert`, {
    version: opRecord.version,
    reason: 'Ready to invoice',
    target: 'invoices',
    reference: 'CI-TEST-1',
  });
  const commercial = r.data.id;
  check('Proforma converts into commercial invoice with preserved lines', () =>
    assert.equal(r.status, 201),
  );
  opRecord = await opGet('invoices', commercial);
  r = await call(`operations/invoices/${commercial}/save`, {
    ...opRecord,
    warehouseId: opWarehouse,
    reason: 'Assign dispatch warehouse',
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await opStatus('invoices', commercial, 'Posted');
  check('Commercial invoice posts balanced tax and receivable entries', () =>
    assert.equal(r.status, 200, JSON.stringify(r.data)),
  );
  r = await opStatus('invoices', commercial, 'Posted');
  check('Duplicate operational posting is rejected', () =>
    assert.equal(r.status, 400),
  );
  r = await call(`records/invoices/${commercial}/post`, {});
  check('Legacy endpoints cannot mutate operational documents', () =>
    assert.notEqual(r.status, 200),
  );
  const receipt = await opCreate('receipts', {
    reference: 'REC-TEST-1',
    date: '2026-09-09',
    currencyId,
    partnerId: opCustomer,
    invoiceId: commercial,
    amount: '100',
    bankReference: 'BANK-TEST',
  });
  assert.equal((await opStatus('receipts', receipt, 'Posted')).status, 200);
  const excessive = await opCreate('receipts', {
    reference: 'REC-TEST-2',
    date: '2026-09-09',
    currencyId,
    partnerId: opCustomer,
    invoiceId: commercial,
    amount: '200',
    bankReference: 'BANK-TEST-2',
  });
  r = await opStatus('receipts', excessive, 'Posted');
  check('Receipts cannot exceed the outstanding invoice balance', () =>
    assert.equal(r.status, 400),
  );
  r = await opStatus('invoices', commercial, 'Reversed');
  check('Invoice reversal is blocked while dependent receipts exist', () =>
    assert.equal(r.status, 400),
  );
  assert.equal((await opStatus('receipts', receipt, 'Reversed')).status, 200);
  assert.equal(
    (await opStatus('receipts', excessive, 'Cancelled')).status,
    200,
  );
  r = await opStatus('invoices', commercial, 'Reversed');
  check('Invoice reversal succeeds after dependent receipts are resolved', () =>
    assert.equal(r.status, 200, JSON.stringify(r.data)),
  );
  const machine = await opCreate('machines', {
    name: 'Lathe serial',
    serialNumber: 'any / serial #1',
    productId: opProduct,
    warehouseId: opWarehouse,
  });
  r = await call('operations/machines', {
    name: 'Duplicate',
    serialNumber: 'any / serial #1',
    productId: opProduct,
    warehouseId: opWarehouse,
  });
  check('Machine serials are unique without grammar restrictions', () =>
    assert.equal(r.status, 409),
  );
  r = await call(`operations/machines/${machine}/document`, {
    filename: 'inspection.txt',
    mime: 'text/plain',
    category: 'Inspection report',
    content: btoa('Inspected and accepted.'),
    status: 'Final',
  });
  check('Entity document upload persists file metadata and content', () =>
    assert.equal(r.status, 201),
  );
  const documentId = r.data.id;
  const downloaded = await mf.dispatchFetch(
    `http://localhost/api/v1/operations/documents/${documentId}`,
    { headers: { Cookie: cookie } },
  );
  check('Authorised file download returns original bytes', () =>
    assert.equal(downloaded.status, 200),
  );
  assert.equal(await downloaded.text(), 'Inspected and accepted.');
  r = await call('operations/data', undefined, '');
  check('All operational data requires authentication', () =>
    assert.equal(r.status, 401),
  );

  const secondWarehouse = await opCreate('warehouses', {
    name: 'Transfer destination',
  });
  const transfer = await opCreate('stock-transfers', {
    reference: 'TR-1',
    date: '2026-09-09',
    currencyId,
    productId: opProduct,
    warehouseId: opWarehouse,
    toWarehouseId: secondWarehouse,
    quantity: '1',
    reason: 'Relocate',
  });
  r = await opStatus('stock-transfers', transfer, 'Posted');
  check('Stock transfer posts both source and destination movements', () =>
    assert.equal(r.status, 200, JSON.stringify(r.data)),
  );
  let balances = (await call('operations/stock')).data;
  check('Transfer conserves quantity and inventory value', () => {
    const b = balances.filter((r) => r.product_id === opProduct);
    assert.equal(
      b.reduce((s, r) => s + r.quantity, 0),
      2,
    );
    assert.equal(
      b.reduce((s, r) => s + r.value, 0),
      20450,
    );
  });
  const tooMuch = await opCreate('stock-transfers', {
    reference: 'TR-2',
    date: '2026-09-09',
    currencyId,
    productId: opProduct,
    warehouseId: opWarehouse,
    toWarehouseId: secondWarehouse,
    quantity: '4',
    reason: 'Relocate',
  });
  r = await opStatus('stock-transfers', tooMuch, 'Posted');
  check('Transfer cannot overdraw its source warehouse', () =>
    assert.equal(r.status, 400),
  );
  r = await call('operations/invoices', undefined, l.cookie.split(';')[0]);
  check('Logistics cannot access invoice operational API', () =>
    assert.equal(r.status, 403),
  );
  const foreignOp = (await call('operations/data')).data;
  check('Operational records are isolated between tenants', () =>
    assert.ok(!foreignOp.some((r) => r.id === 'foreign-record')),
  );

  r = await call(
    'operations/customers',
    { name: 'Forbidden', country: 'India' },
    viewerCookie,
  );
  check('Viewer cannot create operational records', () =>
    assert.equal(r.status, 403),
  );
  const templateId = await opCreate('master-document-templates', {
    name: 'Invoice template',
    documentType: 'Invoice',
    body: 'Reference: {{reference}}\nCompany: {{company}}\nTotal: {{total}}\n{{lines}}',
  });
  r = await call(`operations/invoices/${commercial}/generate`, { templateId });
  check('Template engine creates a versioned Word document', () =>
    assert.equal(r.status, 201, JSON.stringify(r.data)),
  );
  const generated = await mf.dispatchFetch(
    `http://localhost/api/v1/operations/documents/${r.data.id}`,
    { headers: { Cookie: cookie } },
  );
  const generatedBytes = new Uint8Array(await generated.arrayBuffer());
  check('Generated document is a DOCX archive', () => {
    assert.deepEqual([...generatedBytes.slice(0, 4)], [80, 75, 3, 4]);
    assert.match(generated.headers.get('content-type'), /wordprocessingml/);
  });
  const brokenTemplate = await opCreate('master-document-templates', {
    name: 'Missing data',
    documentType: 'Invoice',
    body: '{{unrecognised}}',
  });
  r = await call(`operations/invoices/${commercial}/generate`, {
    templateId: brokenTemplate,
  });
  check(
    'Missing template variables prevent incomplete document generation',
    () => assert.equal(r.status, 400),
  );
  const advance = await opCreate('customer-advances', {
    reference: 'ADV-TEST',
    date: '2026-09-09',
    currencyId,
    partnerId: opCustomer,
    amount: '80',
    bankReference: 'ADV-BANK',
  });
  assert.equal(
    (await opStatus('customer-advances', advance, 'Posted')).status,
    200,
  );
  const serviceInvoice = await opCreate('invoices', {
    ...base,
    reference: 'SERVICE-CI',
    warehouseId: opWarehouse,
    lines: [{ description: 'Inspection service', quantity: '1', rate: '100' }],
  });
  assert.equal(
    (await opStatus('invoices', serviceInvoice, 'Posted')).status,
    200,
  );
  const adjustment = await opCreate('customer-advance-adjustments', {
    reference: 'ADJ-TEST',
    date: '2026-09-09',
    currencyId,
    partnerId: opCustomer,
    advanceId: advance,
    invoiceId: serviceInvoice,
    amount: '50',
  });
  r = await opStatus('customer-advance-adjustments', adjustment, 'Posted');
  check(
    'Customer advance adjustment settles invoice without cash duplication',
    () => assert.equal(r.status, 200, JSON.stringify(r.data)),
  );
  const refund = await opCreate('customer-advance-refunds', {
    reference: 'REFUND-TEST',
    date: '2026-09-09',
    currencyId,
    partnerId: opCustomer,
    advanceId: advance,
    amount: '40',
    bankReference: 'REFUND-BANK',
  });
  r = await opStatus('customer-advance-refunds', refund, 'Posted');
  check('Refund cannot consume an already adjusted advance balance', () =>
    assert.equal(r.status, 400),
  );
  let refundRecord = await opGet('customer-advance-refunds', refund);
  r = await call(`operations/customer-advance-refunds/${refund}/save`, {
    ...refundRecord,
    amount: '30',
    reason: 'Refund remaining balance',
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await opStatus('customer-advance-refunds', refund, 'Posted');
  check('Remaining customer advance can be refunded', () =>
    assert.equal(r.status, 200, JSON.stringify(r.data)),
  );
  r = await opStatus('customer-advances', advance, 'Reversed');
  check(
    'Advance reversal is blocked while adjustments and refunds are posted',
    () => assert.equal(r.status, 400),
  );
  const opData = (await call('operations/data')).data;
  check('Net outstanding reflects advance adjustments', () => {
    const allocations = opData.filter(
      (x) => x.invoiceId === serviceInvoice && x.status === 'Posted',
    );
    assert.equal(
      allocations.reduce((s, x) => s + x.amount, 0),
      5000,
    );
  });
  const material = await opCreate('products', {
    name: 'Raw material',
    sku: 'RAW-TEST',
  });
  const outputProduct = await opCreate('products', {
    name: 'Finished product',
    sku: 'FIN-TEST',
  });
  const opening = await opCreate('stock-adjustments', {
    reference: 'OPEN-TEST',
    date: '2026-09-09',
    currencyId,
    productId: material,
    warehouseId: opWarehouse,
    direction: 'Receipt',
    quantity: '4',
    unitCost: '5',
    reason: 'Opening balance',
  });
  assert.equal(
    (await opStatus('stock-adjustments', opening, 'Posted')).status,
    200,
  );
  const bom = await opCreate('master-bom', {
    name: 'Test BOM',
    productId: outputProduct,
    revision: '1',
    components: '2 raw units per finished unit',
  });
  const production = await opCreate('production-orders', {
    reference: 'PROD-TEST',
    date: '2026-09-09',
    currencyId,
    bomId: bom,
    productId: outputProduct,
    quantity: '2',
  });
  assert.equal(
    (await opStatus('production-orders', production, 'Confirmed')).status,
    200,
  );
  const consumption = await opCreate('material-consumption', {
    reference: 'CONSUME-TEST',
    date: '2026-09-09',
    currencyId,
    sourceId: production,
    productId: material,
    warehouseId: opWarehouse,
    quantity: '4',
  });
  r = await opStatus('material-consumption', consumption, 'Posted');
  check('Production consumption moves material value to work in progress', () =>
    assert.equal(r.status, 200, JSON.stringify(r.data)),
  );
  const output = await opCreate('production-output', {
    reference: 'OUTPUT-TEST',
    date: '2026-09-09',
    currencyId,
    sourceId: production,
    productId: outputProduct,
    warehouseId: opWarehouse,
    quantity: '2',
  });
  r = await opStatus('production-output', output, 'Posted');
  check('Production output receives the consumed cost', () =>
    assert.equal(r.status, 200, JSON.stringify(r.data)),
  );
  balances = (await call('operations/stock')).data;
  check('Production conserves material cost in finished inventory', () => {
    const finished = balances.find((r) => r.product_id === outputProduct);
    assert.equal(finished.quantity, 2);
    assert.equal(finished.value, 2000);
  });
  r = await call('operations/quotations', {
    ...base,
    reference: 'OVERRIDE-TEST',
    lines: [
      {
        description: 'Service',
        quantity: '1',
        rate: '100',
        gstRate: '18',
        gstOverride: '10',
      },
    ],
  });
  check('Tax amount overrides require a reason', () =>
    assert.equal(r.status, 400),
  );
  const salesUser = (await call('sales/lookups')).data.users[0].id;
  const salesTerms = await opCreate('master-payment-terms', {
    name: 'Net 30',
    days: '30',
  });
  const salesTax = await opCreate('tax-codes', {
    name: 'GST 18',
    gstRate: '18',
  });
  const salesProduct = await opCreate('products', {
    name: 'Sales engine product',
    sku: 'SALES-ENGINE',
  });
  const salesBase = {
    ...base,
    validUntil: '2026-12-31',
    quotationType: 'Domestic',
    salesPersonId: salesUser,
    paymentTermsId: salesTerms,
    taxTreatment: 'Unregistered',
    placeOfSupply: 'Maharashtra',
    gstSplit: 'CGST + SGST',
    billingAddress: 'Test address',
    shippingAddress: 'Test address',
    internalNotes: 'PRIVATE-COST-NOTE',
    internalCosting: { product: '42' },
    freight: '10',
    lines: [
      {
        productId: salesProduct,
        description: 'Lathe',
        quantity: '1',
        rate: '100',
        discountPercent: '10',
        uom: 'PCS',
        taxCodeId: salesTax,
        gstRate: '99',
      },
    ],
  };
  r = await call('sales/quotations', salesBase);
  check('Sales draft saves with automatic number', () =>
    assert.equal(r.status, 201, JSON.stringify(r.data)),
  );
  const salesId = r.data.id;
  let salesDetail = (await call('sales/quotations/' + salesId)).data;
  check('Pricing uses tax master, discount and header charges', () => {
    assert.equal(salesDetail.record.amount, 11620);
    assert.equal(salesDetail.record.totals.cgst, 810);
    assert.equal(salesDetail.internal.notes, 'PRIVATE-COST-NOTE');
    assert.equal(salesDetail.record.internalNotes, undefined);
  });
  async function salesAction(id, action, body = {}, kind = 'quotations') {
    const current = (await call(`sales/${kind}/${id}`)).data.record;
    return call(`sales/${kind}/${id}/${action}`, {
      version: current.version,
      reason: 'Verified in integration test',
      ...body,
    });
  }
  const incomplete = (
    await call('sales/quotations', { date: '2026-09-09', lines: [] })
  ).data.id;
  r = await salesAction(incomplete, 'status', { status: 'Under Review' });
  check('Incomplete drafts cannot be submitted', () =>
    assert.equal(r.status, 422),
  );
  for (const status of ['Under Review', 'Approved', 'Sent', 'Accepted']) {
    r = await salesAction(salesId, 'status', { status });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
  check('Sales review approval and acceptance lifecycle', () =>
    assert.equal(r.status, 200),
  );
  r = await salesAction(salesId, 'save', salesBase);
  check('Issued sales versions cannot be edited', () =>
    assert.equal(r.status, 400),
  );
  r = await call(`operations/quotations/${salesId}/save`, {
    ...salesBase,
    version: (await call('sales/quotations/' + salesId)).data.record.version,
  });
  check('Generic editor cannot bypass sales locking', () =>
    assert.equal(r.status, 409),
  );
  r = await salesAction(salesId, 'document');
  check('Customer document generation', () =>
    assert.equal(r.status, 201, JSON.stringify(r.data)),
  );
  const testDB = await mf.getD1Database('DB');
  const customerFile = JSON.parse(
    (
      await testDB
        .prepare('SELECT data FROM records WHERE id=?')
        .bind(r.data.id)
        .first()
    ).data,
  );
  const customerBytes = await (
    await (await mf.getR2Bucket('FILES')).get(customerFile.objectKey)
  ).text();
  check('Customer document excludes internal costing', () => {
    assert.ok(!customerBytes.includes('PRIVATE-COST-NOTE'));
    assert.ok(customerBytes.includes('Lathe'));
  });
  r = await salesAction(salesId, 'revise');
  const revisedId = r.data.id;
  check('Revision creates a new immutable predecessor', () =>
    assert.equal(r.status, 201, JSON.stringify(r.data)),
  );
  assert.equal(
    (await call('sales/quotations/' + salesId)).data.record.status,
    'Revised',
  );
  salesDetail = (await call('sales/quotations/' + revisedId)).data;
  assert.equal(salesDetail.internal.notes, 'PRIVATE-COST-NOTE');
  r = await salesAction(revisedId, 'save', {
    ...salesBase,
    internalNotes: 'NEW-PRIVATE-NOTE',
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(
    (await call('sales/quotations/' + revisedId)).data.internal.notes,
    'NEW-PRIVATE-NOTE',
  );
  for (const status of ['Under Review', 'Approved', 'Sent', 'Accepted'])
    assert.equal(
      (await salesAction(revisedId, 'status', { status })).status,
      200,
    );
  r = await salesAction(revisedId, 'convert', { target: 'sales-orders' });
  check('Accepted quotation converts to linked sales order', () =>
    assert.equal(r.status, 201, JSON.stringify(r.data)),
  );
  const orderId = r.data.id;
  const salesOrderDetail = (await call('sales/sales-orders/' + orderId)).data;
  assert.equal(salesOrderDetail.record.sourceId, revisedId);
  assert.equal(salesOrderDetail.record.status, 'Draft');
  assert.ok(
    !(await call('operations/data')).data.some((x) =>
      ['sales-internal', 'sales-draft'].includes(x.kind),
    ),
  );
  const viewerSales = (
    await call('sales/quotations/' + revisedId, undefined, viewerCookie)
  ).data;
  check('Viewer cannot retrieve internal costing', () =>
    assert.equal(viewerSales.internal, undefined),
  );
  assert.equal(
    (await call('sales/draft/quotations-new', undefined, viewerCookie)).status,
    403,
  );
  const concurrentSales = await Promise.all([
    call('sales/quotations', salesBase),
    call('sales/quotations', salesBase),
  ]);
  check('Concurrent drafts receive unique numbers', () => {
    assert.ok(concurrentSales.every((x) => x.status === 201));
    assert.notEqual(concurrentSales[0].data.id, concurrentSales[1].data.id);
  });
  const numbers = await Promise.all(
    concurrentSales.map((x) => call('sales/quotations/' + x.data.id)),
  );
  assert.notEqual(
    numbers[0].data.record.reference,
    numbers[1].data.record.reference,
  );
  for (const status of ['Under Review', 'Approved', 'Sent', 'Accepted'])
    assert.equal(
      (await salesAction(orderId, 'status', { status }, 'sales-orders')).status,
      200,
    );
  const convertedInvoice = await salesAction(
    orderId,
    'convert',
    { target: 'invoices' },
    'sales-orders',
  );
  assert.equal(
    convertedInvoice.status,
    201,
    JSON.stringify(convertedInvoice.data),
  );
  const invoiceV2 = convertedInvoice.data.id;
  r = await opStatus('invoices', invoiceV2, 'Posted');
  check('Invoice posting cannot bypass approval', () =>
    assert.equal(r.status, 409),
  );
  for (const status of ['Under Review', 'Approved', 'Sent', 'Accepted'])
    assert.equal(
      (await salesAction(invoiceV2, 'status', { status }, 'invoices')).status,
      200,
    );
  const extraStock = await opCreate('purchase-invoices', {
    ...base,
    reference: 'SALES-ENGINE-STOCK',
    lines: [
      {
        productId: salesProduct,
        description: 'Test stock',
        quantity: '2',
        rate: '50',
      },
    ],
    partnerId: opVendor,
  });
  assert.equal(
    (await opStatus('purchase-invoices', extraStock, 'Posted')).status,
    200,
  );
  r = await opStatus('invoices', invoiceV2, 'Posted');
  check('New sales invoice posts balanced pricing and stock', () =>
    assert.equal(r.status, 200, JSON.stringify(r.data)),
  );
  await call('sales/draft/quotations-new', { payload: salesBase });
  const protectedSalesDraft = (await call('sales/draft/quotations-new')).data;
  check('Draft protection survives a separate request', () =>
    assert.equal(
      protectedSalesDraft.payload.internalNotes,
      'PRIVATE-COST-NOTE',
    ),
  );
  await build({
    entryPoints: ['lib/sales-engine.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: '.test-output/sales.mjs',
  });
  const { priceSales } = await import('../.test-output/sales.mjs');
  check('Tax inclusive pricing and withholding bases', () => {
    const p = priceSales({
      taxInclusive: true,
      withholdingBase: 'Tax inclusive',
      lines: [{ quantity: '1', rate: '118', gstRate: '18', tcsRate: '1' }],
    });
    assert.equal(p.totals.taxable, 10000);
    assert.equal(p.totals.gst, 1800);
    assert.equal(p.totals.tcs, 118);
  });
  await build({
    entryPoints: ['lib/workbook-reports.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: '.test-output/workbook-reports.mjs',
  });
  const { workbookReports } =
    await import('../.test-output/workbook-reports.mjs');
  const sourceFacts = [
    {
      domain: 'sales',
      type: 'Export Sales',
      invoice: 'WB-INV',
      party: 'Workbook customer',
      date: '2026-04-01',
      fy: '2026–27',
      usd: '100',
      basic: '9000',
      invoiceValue: '10620',
      igst: '1620',
      exchangeRate: '90',
      settledUsd: '60',
      cashUsd: '59',
      charges: '1',
      conversionRate: '91',
      paid: '5369',
      paymentDate: '2026-04-02',
      hasPayment: true,
      bankRef: 'SHARED',
    },
    {
      domain: 'sales',
      type: 'Part Receipts',
      invoice: 'WB-INV',
      party: 'Workbook customer',
      date: '2026-04-01',
      fy: '2026–27',
      settledUsd: '40',
      cashUsd: '40',
      paid: '3640',
      conversionRate: '91',
      paymentDate: '2026-04-05',
      hasPayment: true,
      bankRef: 'SECOND',
    },
    {
      domain: 'purchase',
      type: 'Purchase',
      invoice: 'SAME-NO',
      party: 'Supplier A',
      date: '2026-04-01',
      fy: '2026–27',
      payable: '100',
      paid: '50',
      basic: '80',
      serial: 'MACHINE-1',
      inventoryStatus: 'Not Sold',
      linkedInvoice: 'WB-INV',
    },
    {
      domain: 'purchase',
      type: 'Part Payment',
      invoice: 'SAME-NO',
      party: 'Supplier A',
      date: '2026-04-01',
      fy: '2026–27',
      payable: '0',
      paid: '50',
    },
    {
      domain: 'purchase',
      type: 'Purchase',
      invoice: 'SAME-NO',
      party: 'Supplier B',
      date: '2026-04-01',
      fy: '2026–27',
      payable: '200',
      paid: '0',
      basic: '160',
    },
    {
      domain: 'expense',
      type: 'Freight',
      invoice: 'EXP-1',
      party: 'Forwarder',
      date: '2026-04-01',
      fy: '2026–27',
      basic: '10',
      linkedInvoice: 'WB-INV, OTHER',
    },
  ];
  const workbookTables = workbookReports(sourceFacts, '2026–27', '2026-09-10');
  const wbtable = (k) => workbookTables.find((t) => t.key === k);
  check(
    'Workbook receipts settle one invoice without duplicate revenue',
    () => {
      const x = wbtable('debtors-usd').rows[0];
      assert.equal(x.value, 10000);
      assert.equal(x.paid, 10000);
      assert.equal(x.pending, 0);
    },
  );
  check('Workbook INR balances use invoice FX, not cash conversion FX', () => {
    assert.equal(wbtable('debtors-inr').rows[0].paid, 900000);
    assert.equal(wbtable('incentives').rows[0].fx, 10000);
  });
  check('Supplier invoice numbers are scoped to their supplier', () => {
    const rows = wbtable('supplier-payments').rows;
    assert.equal(rows.length, 2);
    assert.equal(rows.find((r) => r.party === 'Supplier A').balance, 0);
    assert.equal(rows.find((r) => r.party === 'Supplier B').balance, 20000);
  });
  check('Shared expenses are not arbitrarily allocated twice', () => {
    assert.equal(wbtable('shared-expenses').rows.length, 1);
    assert.equal(wbtable('gross-profit').rows[0].expenses, 0);
  });
  check('Inventory is rebuilt from purchase rows, not payment rows', () =>
    assert.equal(wbtable('inventory').rows.length, 1),
  );
  check('IGST receivable stays separate from settled customer debt', () =>
    assert.equal(wbtable('igst').rows[0].pending, 162000),
  );
  const batchMeta = {
    batchId: 'test-import',
    sheets: [
      {
        index: 0,
        name: 'Test source',
        maxRow: 2,
        maxColumn: 2,
        cellCount: 2,
        state: 'hidden',
      },
    ],
    issues: [],
    sourceRowCount: sourceFacts.length,
  };
  const wbTenant = (
    await testDB
      .prepare("SELECT tenant_id FROM users WHERE email='test@example.test'")
      .first()
  ).tenant_id;
  await testDB
    .prepare('INSERT INTO workbook_imports VALUES(?,?,?,?,?,?,?)')
    .bind(
      'test-import',
      wbTenant,
      'test.xlsx',
      'testhash',
      JSON.stringify(batchMeta),
      new Uint8Array([80, 75, 3, 4]).buffer,
      new Date().toISOString(),
    )
    .run();
  await testDB
    .prepare('INSERT INTO workbook_sheets VALUES(?,?,?,?)')
    .bind('test-import', 0, 'Test source', JSON.stringify(batchMeta.sheets[0]))
    .run();
  await testDB
    .prepare('INSERT INTO workbook_rows VALUES(?,?,?,?)')
    .bind(
      'test-import',
      0,
      1,
      JSON.stringify([
        {
          address: 'A1',
          column: 1,
          cached: 'Private source heading',
          value: 'Private source heading',
          type: 's',
        },
      ]),
    )
    .run();
  await testDB
    .prepare('INSERT INTO workbook_rows VALUES(?,?,?,?)')
    .bind(
      'test-import',
      0,
      2,
      JSON.stringify([
        { address: 'B2', column: 2, cached: 20, value: '=10+10', type: 'f' },
      ]),
    )
    .run();
  for (const [i, f] of sourceFacts.entries())
    await testDB
      .prepare('INSERT INTO workbook_facts VALUES(?,?,?,?,?)')
      .bind(
        'wb-fact-' + i,
        'test-import',
        wbTenant,
        f.domain,
        JSON.stringify(f),
      )
      .run();
  r = await call('workbook');
  check('Workbook import coverage is available to authorised users', () =>
    assert.equal(r.data.sourceRowCount, 6),
  );
  r = await call('workbook/sheet?sheet=0');
  check('Source formulas and hidden sheets remain inspectable', () => {
    assert.equal(r.data.sheet.state, 'hidden');
    assert.equal(r.data.rows[1].cells[0].value, '=10+10');
  });
  r = await call('workbook/reports?fy=2026%E2%80%9327&asOf=2026-09-10');
  check('Workbook reports load through authenticated API', () =>
    assert.equal(
      r.data.tables.find((t) => t.key === 'debtors-usd').rows[0].pending,
      0,
    ),
  );
  r = await call('workbook', undefined, viewerCookie);
  check('Raw workbook data is restricted by role', () =>
    assert.equal(r.status, 403),
  );
  r = await call('workbook', undefined, '');
  check('Raw workbook data requires authentication', () =>
    assert.equal(r.status, 401),
  );
  const download = await mf.dispatchFetch(
    'http://localhost/api/v1/workbook/download',
    { headers: { Cookie: cookie } },
  );
  check('Original workbook download returns preserved bytes', () =>
    assert.equal(download.status, 200),
  );
  assert.deepEqual(
    [...new Uint8Array(await download.arrayBuffer())],
    [80, 75, 3, 4],
  );
  const locked = {
    operation: true,
    importLocked: true,
    reference: 'IMPORTED-LOCK',
    date: '2026-04-01',
    status: 'Imported',
    sourceWorkbook: { batchId: 'test-import', sheet: 'Test source', rows: [2] },
  };
  await testDB
    .prepare(
      'INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)',
    )
    .bind(
      'locked-import',
      wbTenant,
      'invoices',
      '2026–27',
      JSON.stringify(locked),
      new Date().toISOString(),
    )
    .run();
  r = await call('operations/invoices/locked-import/status', {
    status: 'Posted',
    version: 1,
    reason: 'Must not post',
  });
  check('Imported financial records cannot be reposted', () =>
    assert.equal(r.status, 409),
  );
  r = await call('sales/invoices/locked-import/save', { version: 1 });
  check('Sales editor cannot overwrite workbook records', () =>
    assert.equal(r.status, 409),
  );
  r = await call('workbook/record/locked-import');
  check('ERP record resolves to original workbook cells', () =>
    assert.equal(r.data.rows[0].cells[0].address, 'B2'),
  );

  // Relationship integration uses synthetic records only.
  async function graphSeed(id, kind, data, tenant = wbTenant) {
    await testDB
      .prepare(
        'INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)',
      )
      .bind(
        id,
        tenant,
        kind,
        '2026–27',
        JSON.stringify({
          reference: id,
          date: '2026-04-01',
          status: 'Imported',
          ...data,
        }),
        new Date().toISOString(),
      )
      .run();
  }
  await graphSeed('g-customer', 'customers', { name: 'Graph customer' });
  await graphSeed('g-supplier', 'vendors', { name: 'Graph supplier' });
  await graphSeed('g-purchase', 'purchase-invoices', {
    partnerId: 'g-supplier',
    amount: 50000,
    relatedIds: ['g-invoice'],
  });
  await graphSeed('g-invoice', 'invoices', {
    partnerId: 'g-customer',
    totalUsd: '1000',
    amount: 100000,
    currency: 'INR',
  });
  await graphSeed('g-machine', 'machines', {
    purchaseId: 'g-purchase',
    salesInvoiceId: 'g-invoice',
    serialNumber: 'GRAPH-SERIAL-001',
  });
  await graphSeed('g-sb', 'shipping-bills', { sourceId: 'g-invoice' });
  await graphSeed('g-bl', 'bills-of-lading', { sourceId: 'g-sb' });
  await graphSeed('g-receipt', 'receipts', {
    invoiceId: 'g-invoice',
    amount: 25000,
    settledAmount: 25000,
    currency: 'USD',
    bankReference: 'GRAPH-BANK-001',
  });
  await graphSeed('g-ebrc', 'ebrc', {
    sourceId: 'g-invoice',
    receiptId: 'g-receipt',
  });
  await graphSeed('g-private', 'sales-internal', {
    sourceId: 'g-invoice',
    internalCosting: { secret: 'restricted' },
  });
  r = await call('relationships/g-purchase');
  check('Supplier invoice traces equipment through export to eBRC', () => {
    assert.equal(r.status, 200);
    assert.ok(r.data.records.some((n) => n.id === 'g-ebrc'));
    assert.ok(r.data.records.some((n) => n.id === 'g-machine'));
  });
  check('Partial receipt does not mark payment complete', () =>
    assert.equal(
      r.data.pending.find((p) => p.key === 'Customer receipt').complete,
      false,
    ),
  );
  check('Unverified related IDs remain review candidates', () =>
    assert.ok(r.data.candidates.some((e) => e.source_id === 'g-purchase')),
  );
  const graphCandidate = r.data.candidates.find(
    (e) => e.source_id === 'g-purchase',
  );
  r = await call(
    'relationships/review/' + encodeURIComponent(graphCandidate.id),
    {
      status: 'Confirmed',
      reason: 'Checked source allocation',
      version: graphCandidate.version,
    },
  );
  check('Relationship confirmation is saved', () =>
    assert.equal(r.status, 200),
  );
  r = await call(
    'relationships/review/' + encodeURIComponent(graphCandidate.id),
    {
      status: 'Rejected',
      reason: 'Stale review',
      version: graphCandidate.version,
    },
  );
  check('Stale relationship review is rejected', () =>
    assert.equal(r.status, 409),
  );
  r = await call('relationships/search?q=GRAPH-SERIAL');
  check('Global search finds equipment by serial', () =>
    assert.ok(r.data.some((n) => n.id === 'g-machine')),
  );
  r = await call('relationships/search?q=GRAPH-BANK');
  check('Global search finds bank references', () =>
    assert.ok(r.data.some((n) => n.id === 'g-receipt')),
  );
  r = await call('relationships/search?q=restricted', undefined, viewerCookie);
  check('Relationship search hides internal sales records', () =>
    assert.ok(!r.data.some((n) => n.id === 'g-private')),
  );
  r = await call('relationships/g-invoice', undefined, l.cookie.split(';')[0]);
  check('Logistics cannot open financial graph roots', () =>
    assert.equal(r.status, 404),
  );
  r = await call(
    'relationships/link',
    {
      sourceId: 'g-invoice',
      targetId: 'g-purchase',
      type: 'COSTED_FROM',
      reason: 'Forbidden',
    },
    viewerCookie,
  );
  check('Viewer cannot create relationships', () =>
    assert.equal(r.status, 403),
  );
  r = await call('relationships/link', {
    sourceId: 'g-invoice',
    targetId: 'missing-other-tenant',
    type: 'REFERENCES',
    reason: 'Must fail',
  });
  check('Missing or cross-company relationship target is rejected', () =>
    assert.equal(r.status, 400),
  );
  r = await call('relationships/g-invoice', undefined, '');
  check('Graph requires authentication', () => assert.equal(r.status, 401));
  r = await call('relationships/task', {
    recordId: 'g-invoice',
    name: 'Review BL',
    owner: 'Export team',
    dueDate: '2026-09-20',
  });
  check('Next action creates a linked task', () => assert.equal(r.status, 200));
  const graphTask = r.data.id;
  r = await call('relationships/g-invoice');
  check('New tasks immediately appear in transaction graph', () =>
    assert.ok(r.data.records.some((n) => n.id === graphTask)),
  );
  check('Financial reconciliation retains currency and partial balance', () =>
    assert.equal(
      r.data.financial.lines.find((n) => n.id === 'g-invoice').balance,
      75000,
    ),
  );
  r = await call('relationships/calculate', {
    recordId: 'g-invoice',
    rule: 'fx',
    inputs: {
      foreignAmount: 1000,
      invoiceRate: 80,
      bankRate: 82,
      bankChargesInr: 100,
    },
  });
  check('Versioned FX separates bank fees from exchange gain', () => {
    assert.equal(r.data.result.cashInr, 81900);
    assert.equal(r.data.result.fxGainInr, 2000);
  });
  r = await call('relationships/calculate', {
    recordId: 'g-invoice',
    rule: 'tax',
    inputs: {
      taxableInr: 1000,
      gstRate: 18,
      tcsRate: 1,
      tdsRate: 1,
      interstate: true,
    },
  });
  check('Versioned tax rule uses explicit GST TCS and TDS bases', () => {
    assert.equal(r.data.result.igst, 180);
    assert.equal(r.data.result.payable, 1181.8);
  });
  r = await call('relationships/calculate', {
    recordId: 'g-invoice',
    rule: 'fx',
    inputs: {
      foreignAmount: 1000,
      invoiceRate: 0,
      bankRate: 82,
      bankChargesInr: 0,
    },
  });
  check('Invalid FX rate is rejected', () => assert.equal(r.status, 400));
  await testDB
    .prepare('UPDATE records SET data=?,version=version+1 WHERE id=?')
    .bind(
      JSON.stringify({ reference: 'Revised supplier invoice', amount: 60000 }),
      'g-purchase',
    )
    .run();
  r = await call('relationships/g-purchase');
  check('Commercial edits preserve the prior version', () =>
    assert.ok(r.data.versions.some((v) => JSON.parse(v.data).amount === 50000)),
  );
  let graphVersionTamper = false;
  try {
    await testDB
      .prepare('DELETE FROM record_versions WHERE record_id=?')
      .bind('g-purchase')
      .run();
  } catch {
    graphVersionTamper = true;
  }
  check('Prior versions cannot be deleted', () =>
    assert.ok(graphVersionTamper),
  );
  r = await call('relationships/control');
  check('Control tower reports missing export evidence', () =>
    assert.ok(
      r.data.exceptions.some(
        (e) => e.recordId === 'g-invoice' && e.category === 'Forex reference',
      ),
    ),
  );
  r = await call('relationships/dictionary');
  check(
    'Data dictionary exposes fields, workflow and calculation versions',
    () => {
      assert.ok(r.data.entities.some((e) => e.entity === 'ebrc'));
      assert.ok(r.data.rules.every((r) => r.version === 1));
    },
  );
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
