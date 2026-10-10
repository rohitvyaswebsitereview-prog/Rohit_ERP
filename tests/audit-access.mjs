import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
const { Miniflare } = require('miniflare');

await mkdir('.test-output/audit-access', { recursive: true });
await build({
  stdin: { contents: "import {handle} from './lib/server/service.ts';export default {fetch:handle};", resolveDir: process.cwd() },
  bundle: true, mainFields: ['module', 'main'], format: 'esm', platform: 'neutral', external: ['cloudflare:workers'],
  outfile: '.test-output/audit-access/worker.mjs',
});
await build({ entryPoints: ['lib/access-policy.ts', 'lib/upload-validation.ts', 'lib/server/word-document.ts'], bundle: true, format: 'esm', platform: 'node', outdir: '.test-output/audit-access/helpers' });
const { redactAccess } = await import('../.test-output/audit-access/helpers/access-policy.js');
const { validateUpload } = await import('../.test-output/audit-access/helpers/upload-validation.js');
const { wordDocument } = await import('../.test-output/audit-access/helpers/server/word-document.js');

assert.deepEqual(redactAccess({ customerGstin: 'PRIVATE', nested: { accountNumber: 'PRIVATE' }, lines: [{ internalNotes: 'PRIVATE', amount: 25 }] }, 'Viewer'),
  { customerGstin: '••••VATE', nested: { accountNumber: '••••VATE' }, lines: [{ amount: 25 }] });
assert.deepEqual(redactAccess({ amount: 25, nested: { cost: 10, label: 'ok' }, lines: [{ price: 9, quantity: 2 }] }, 'Logistics'),
  { nested: { label: 'ok' }, lines: [{ quantity: 2 }] });
assert.deepEqual(redactAccess({ stockValue: 50, unitCost: 12, totalUsd: 22, settledAmount: 8, outstanding: 14, stockCurrency: 'USD', bankChargesInr: 2, foreignAmount: 4, invoiceRate: 82, bankRate: 84, netPayable: 60, reference: 'shipment' }, 'Logistics'),
  { reference: 'shipment' });
assert.deepEqual(redactAccess({ corporateName: 'Acme', shipmentDate: '2026-05-01' }, 'Logistics'), { corporateName: 'Acme', shipmentDate: '2026-05-01' });
assert.equal(redactAccess({ detail: JSON.stringify({ note: 'PRIVATE-CUSTOMER' }) }, 'Viewer').detail.includes('PRIVATE-CUSTOMER'), false);
assert.equal(validateUpload('application/pdf', new TextEncoder().encode('not a pdf')).valid, false);
assert.equal(validateUpload('image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])).valid, false);
assert.equal(validateUpload('image/png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9oLwsAAAAASUVORK5CYII=', 'base64')).valid, true);
assert.equal(validateUpload('text/csv', new TextEncoder().encode('a,b\n1,2\n')).valid, true);
assert.equal(validateUpload('text/csv', new Uint8Array([0, 1, 2])).valid, false);
const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
assert.equal(validateUpload(docxMime, wordDocument('Test', 'Company', 'Body')).valid, true);
assert.equal(validateUpload(docxMime, new TextEncoder().encode('PK\x03\x04[Content_Types].xml word/document.xml')).valid, false);

const mf = new Miniflare({ modules: true, scriptPath: '.test-output/audit-access/worker.mjs', compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'audit-db' }, r2Buckets: ['FILES'] });
async function call(path, body, cookie = adminCookie) {
  const res = await mf.dispatchFetch('http://localhost/api/v1/' + path, body === undefined ? { headers: { Cookie: cookie } } : { method: 'POST', headers: { Cookie: cookie, Origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie') };
}
let adminCookie = '';
try {
  const setup = await call('setup', { name: 'Admin', email: 'admin@example.test', password: 'long-test-password' }, '');
  assert.equal(setup.status, 200);
  adminCookie = setup.cookie.split(';')[0];
  await call('users', { name: 'Viewer', email: 'viewer@example.test', password: 'long-test-password', role: 'Viewer' });
  const viewerLogin = await call('login', { email: 'viewer@example.test', password: 'long-test-password' });
  const viewerCookie = viewerLogin.cookie.split(';')[0];
  const db = await mf.getD1Database('DB');
  const customer = 'audit-customer';
  const invoiceOld = 'audit-old';
  const invoiceNew = 'audit-new';
  const seed = [
    [customer, 'customers', 'master', { operation: true, name: 'Audit Customer', status: 'Active', gstin: 'PRIVATE-CUSTOMER' }],
    [invoiceOld, 'invoices', '2025–26', { operation: true, reference: 'OLD-REF', date: '2025-05-01', partnerId: customer, customerGstin: 'PRIVATE-OLD', amount: 100, status: 'Imported' }],
    [invoiceNew, 'invoices', '2026–27', { operation: true, reference: 'NEW-REF', date: '2026-05-01', partnerId: customer, customerGstin: 'PRIVATE-NEW', amount: 200, status: 'Imported', relatedIds: [invoiceOld] }],
  ];
  for (const [id, kind, fy, data] of seed)
    await db.prepare('INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)').bind(id, 'initial', kind, fy, JSON.stringify(data), data.date || '2026-01-01').run();
  await db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?,?)').bind('audit-old-event', 'initial', 'unused', 'Updated', invoiceOld, 'invoices', JSON.stringify({ changes: [{ field: 'customerGstin', before: 'PRIVATE-OLD' }] }), '2025-05-01T00:00:00Z').run();
  await db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?,?)').bind('audit-new-event', 'initial', 'unused', 'Updated', invoiceNew, 'invoices', JSON.stringify({ changes: [{ field: 'customerGstin', before: 'PRIVATE-NEW' }] }), '2026-05-01T00:00:00Z').run();
  const listed = await call('records?fy=2026%E2%80%9327', undefined, viewerCookie);
  assert.equal(JSON.stringify(listed.body).includes('PRIVATE-NEW'), false, 'Viewer list hides protected identifiers');
  const detail = await call(`sales/invoices/${invoiceNew}`, undefined, viewerCookie);
  assert.equal(JSON.stringify(detail.body).includes('PRIVATE-NEW'), false, 'Viewer sales detail and audit hide protected identifiers');
  const search = await call('relationships/search?q=OLD-REF&fy=2026%E2%80%9327');
  assert.deepEqual(search.body, [], 'current-year search excludes prior-year transactions');
  const allYears = await call('relationships/search?q=OLD-REF&view=All%20data');
  assert.ok(allYears.body.some(x => x.id === invoiceOld), 'all-years search remains available');
  const activity = await call('activity?fy=2026%E2%80%9327&start=2026-05-01&end=2026-06-01&limit=1');
  assert.equal(activity.body.length, 1);
  assert.equal(activity.body[0].id, 'audit-new-event', 'activity pages within selected FY');
  const countBefore = (await db.prepare('SELECT count(*) n FROM entity_relationships').first()).n;
  await call(`relationships/${invoiceNew}`);
  const countAfter = (await db.prepare('SELECT count(*) n FROM entity_relationships').first()).n;
  assert.equal(countAfter, countBefore, 'relationship GET does not persist inferred edges');
  const candidates = await call('relationships/control');
  const candidate = candidates.body.candidates.find(x => x.source_id === invoiceNew && x.target_id === invoiceOld);
  assert.ok(candidate, 'unreviewed candidate remains visible without persistence');
  const reviewed = await call('relationships/review/' + encodeURIComponent(candidate.id), { status: 'Confirmed', reason: 'Verified against source', version: 1 });
  assert.equal(reviewed.status, 200, 'explicit review persists inferred link');
  const staleReview = await call('relationships/review/' + encodeURIComponent(candidate.id), { status: 'Rejected', reason: 'Stale decision', version: 1 });
  assert.equal(staleReview.status, 409, 'stale review cannot overwrite explicit confirmation');
  console.log('PASS audit access and year-aware behavior');
} finally { await mf.dispose(); }
