import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
const { Miniflare } = require('miniflare');

await mkdir('.test-output/audit-attention', { recursive: true });
await build({ entryPoints: ['lib/attention-alerts.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.test-output/audit-attention/alerts.mjs' });
const { attentionAlerts } = await import('../.test-output/audit-attention/alerts.mjs');
const fy = '2026–27';
const records = [
  { id: 'alert-product', kind: 'products', fy: 'master', status: 'Active', name: 'Widget', reorderPoint: 5 },
  { id: 'alert-task', kind: 'tasks', fy, status: 'Open', name: 'Follow up', dueDate: '2026-04-02', owner: 'Operations' },
  { id: 'alert-exception', kind: 'exceptions', fy, status: 'Open', name: 'Missing filing', severity: 'Critical', dueDate: '2026-04-03' },
  { id: 'old-exception', kind: 'exceptions', fy: '2025–26', status: 'Open', name: 'Older issue', severity: 'Warning', dueDate: '2025-04-03' },
];
const balances = [{ tenant_id: 'initial', product_id: 'alert-product', warehouse_id: 'main', currency: 'INR', quantity: 0, value: 0 }];
const expected = attentionAlerts(records, balances, fy, '2026-10-10');
assert.deepEqual(new Set(expected.map(a => a.id)), new Set(['alert-exception', 'task-alert-task', 'stock-alert-product']));
assert.ok(expected.every(a => a.resolution === 'Unresolved' && a.route && a.title && a.name && a.owner));

await build({ stdin: { contents: "import {handle} from './lib/server/service.ts';export default {fetch:handle};", resolveDir: process.cwd() }, bundle: true, mainFields: ['module', 'main'], format: 'esm', platform: 'neutral', external: ['cloudflare:workers'], outfile: '.test-output/audit-attention/worker.mjs' });
const mf = new Miniflare({ modules: true, scriptPath: '.test-output/audit-attention/worker.mjs', compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'attention-db' }, r2Buckets: ['FILES'] });
let cookie = '';
async function call(path, body) {
  const response = await mf.dispatchFetch('http://localhost/api/v1/' + path, body === undefined ? { headers: { Cookie: cookie } } : { method: 'POST', headers: { Cookie: cookie, Origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
}
try {
  const setup = await call('setup', { name: 'Admin', email: 'admin@example.test', password: 'long-test-password' });
  assert.equal(setup.status, 200);
  cookie = setup.cookie.split(';')[0];
  const db = await mf.getD1Database('DB');
  for (const record of records)
    await db.prepare('INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)').bind(record.id, 'initial', record.kind, record.fy, JSON.stringify({ operation: true, ...record }), '2026-05-01').run();
  await db.prepare('INSERT INTO stock_balances(tenant_id,product_id,warehouse_id,currency,quantity,value) VALUES(?,?,?,?,?,?)').bind('initial', 'alert-product', 'main', 'INR', 0, 0).run();
  let result = await call('notifications?fy=' + encodeURIComponent(fy));
  assert.equal(result.status, 200);
  assert.deepEqual(new Set(result.body.map(a => a.id)), new Set(expected.map(a => a.id)), 'bell and dashboard use the same issue IDs');
  assert.ok(result.body.every(a => a.read === false));
  result = await call('notifications/read', { fy });
  assert.equal(result.status, 200);
  result = await call('notifications?fy=' + encodeURIComponent(fy));
  assert.ok(result.body.every(a => a.read === true && a.resolution === 'Unresolved'), 'read acknowledgement does not resolve source issues');
  const otherYear = await call('notifications?fy=2025%E2%80%9326');
  assert.equal(otherYear.body.find(a => a.id === 'old-exception')?.read, false, 'mark-read only covers visible year');
  await db.prepare("UPDATE records SET data=json_set(data,'$.status','Resolved') WHERE id='alert-exception'").run();
  await db.prepare("UPDATE records SET data=json_set(data,'$.status','Completed') WHERE id='alert-task'").run();
  await db.prepare("UPDATE stock_balances SET quantity=10 WHERE product_id='alert-product'").run();
  result = await call('notifications?fy=' + encodeURIComponent(fy));
  assert.deepEqual(result.body, [], 'resolved source conditions leave the attention list');
  console.log('PASS unified attention and read acknowledgement');
} finally { await mf.dispose(); }
