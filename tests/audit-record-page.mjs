import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import test from 'node:test';

const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
const { Miniflare } = require('miniflare');
await mkdir('.test-output/audit-record-page', { recursive: true });
await build({ entryPoints: ['lib/server/record-page.ts', 'lib/load-records.ts'], bundle: true,
  format: 'esm', platform: 'node', outdir: '.test-output/audit-record-page' });
const { recordPage } = await import('../.test-output/audit-record-page/server/record-page.js');
const { loadRecords } = await import('../.test-output/audit-record-page/load-records.js');

const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("ok")}}',
  compatibilityDate: '2026-05-15', d1Databases: { DB: 'paging-test-db' } });
const db = await mf.getD1Database('DB');
await db.exec('CREATE TABLE records(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,kind TEXT NOT NULL,fy TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL)');
const seed = [];
for (let index = 0; index < 1050; index++) {
  const id = `prod-${String(index).padStart(4, '0')}`;
  const fy = index % 2 ? '2025–26' : '2026–27';
  seed.push(db.prepare('INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)')
    .bind(id, 'tenant-a', 'products', fy, JSON.stringify({ name: `Synthetic ${index}`, sku: id, amount: 42,
      gstin: 'SYNTHETIC-SECRET' }), '2026-10-10T00:00:00Z'));
}
seed.push(db.prepare('INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)')
  .bind('master-1', 'tenant-a', 'products', 'master', JSON.stringify({ name: 'Master Synthetic', sku: 'MASTER' }), '2026-10-10T00:00:00Z'));
seed.push(db.prepare('INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)')
  .bind('hidden-1', 'tenant-a', 'journal', '2026–27', JSON.stringify({ reference: 'SECRET-JOURNAL' }), '2026-10-10T00:00:00Z'));
seed.push(db.prepare('INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)')
  .bind('other-1', 'tenant-b', 'products', '2026–27', JSON.stringify({ name: 'OTHER TENANT' }), '2026-10-10T00:00:00Z'));
for (let index = 0; index < seed.length; index += 100) await db.batch(seed.slice(index, index + 100));

const page = async (query = '', role = 'Admin', kinds = ['products']) => {
  const response = await recordPage(new Request(`https://example.test/api/v1/record-page${query}`),
    { tenant_id: 'tenant-a', role }, db, kinds);
  return { status: response.status, body: await response.json() };
};

test('successive bounded pages cover 1050 records once without crossing tenant or kind', async () => {
  const start = performance.now();
  const ids = [];
  for (let offset = 0; ; offset += 200) {
    const result = await page(`?limit=200&offset=${offset}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.total, 1051);
    assert.ok(result.body.records.length <= 200);
    ids.push(...result.body.records.map(record => record.id));
    if (!result.body.hasMore) break;
  }
  assert.equal(ids.length, 1051);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes('other-1') && !ids.includes('hidden-1'));
  assert.equal(ids[0], 'prod-1049');
  assert.equal(ids.at(-1), 'master-1');
  console.log(`Paging load check: ${ids.length} synthetic tenant records, ${Math.round(performance.now() - start)} ms (environment observation only)`);
});

test('financial year includes master records and query searches approved fields', async () => {
  const year = await page('?fy=2026%E2%80%9327&limit=200');
  assert.equal(year.body.total, 526);
  const last = await page('?fy=2026%E2%80%9327&limit=200&offset=400');
  assert.ok(last.body.records.some(record => record.id === 'master-1'));
  const search = await page('?q=prod-0007');
  assert.deepEqual(search.body.records.map(record => record.id), ['prod-0007']);
});

test('role redaction and allowed kinds apply to every page', async () => {
  const result = await page('?limit=2', 'Logistics');
  assert.equal(result.status, 200);
  assert.ok(result.body.records.every(record => !('amount' in record)));
  assert.ok(result.body.records.every(record => !('gstin' in record)));
  assert.equal((await page('?kind=journal')).status, 400);
});

test('invalid bounds and excessive limits are rejected', async () => {
  for (const query of ['?offset=-1', '?limit=201', '?limit=0', '?offset=1.5', '?fy=invalid'])
    assert.equal((await page(query)).status, 400, query);
});

test('client loader assembles pages without a silent record cap', async () => {
  const calls = [];
  const progress = [];
  const api = async path => {
    calls.push(path);
    const { body } = await page('?' + path.split('?')[1]);
    return body;
  };
  const records = await loadRecords(api, (chunk, meta) => progress.push([chunk.length, meta.total]));
  assert.equal(records.length, 1051);
  assert.equal(calls.length, 6);
  assert.deepEqual(progress.at(-1), [51, 1051]);
});

test('client loader rejects non-advancing or contradictory page metadata', async () => {
  await assert.rejects(loadRecords(async () => ({ records: [], total: 1, offset: 0, limit: 200, hasMore: true })), /invalid|empty|progress/i);
  await assert.rejects(loadRecords(async () => ({ records: [{ id: 'a' }], total: 2, offset: 0, limit: 200, hasMore: false })), /incomplete|total/i);
});

test.after(async () => { await mf.dispose(); });
