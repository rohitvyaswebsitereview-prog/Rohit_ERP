import { createRequire } from 'node:module';
import { mkdir, rm } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
await mkdir('.test-output', { recursive: true });
await build({stdin:{contents:`
import assert from 'node:assert/strict';
import * as reports from './components/operation-reports';
assert.equal(typeof reports.documentReportScope,'function','documents need linked-transaction FY and domain scoping');
const data=[
{id:'export',kind:'invoices',fy:'2026–27'},
{id:'domestic',kind:'domestic-invoices',fy:'2026–27'},
{id:'old',kind:'invoices',fy:'2025–26'},
{id:'delivery',kind:'delivery-challans',sourceId:'domestic',fy:'2026–27'},
{id:'eway',kind:'eway-bills',sourceId:'delivery',fy:'2026–27'},
{id:'undated',kind:'invoices',fy:'master'},
{id:'customer',kind:'customers',fy:'master'},
{id:'purchase',kind:'purchase-invoices',fy:'2026–27'},
{id:'cycle-a',kind:'delivery-challans',sourceId:'cycle-b',fy:'2026–27'},
{id:'cycle-b',kind:'delivery-challans',sourceId:'cycle-a',fy:'2026–27'}];
const files=[
{id:'e-upload',entityId:'export',fy:'master'},
{id:'e-generated',entityId:'export',generated:true},
{id:'d-upload',entityId:'domestic'},
{id:'d-child',entityId:'eway'},
{id:'old-file',entityId:'old',created:'2026-10-10'},
{id:'missing-file',entityId:'missing',fy:'2026–27'},
{id:'undated-file',entityId:'undated',created:'2026-10-10'},
{id:'master-file',entityId:'customer'},
{id:'purchase-file',entityId:'purchase'},
{id:'cycle-file',entityId:'cycle-a'}];
const ids=(route,fy='2026–27')=>reports.documentReportScope(files,data,route,fy).rows.map(r=>r.id).sort();
assert.deepEqual(ids('documents-export-documents'),['e-generated','e-upload']);
assert.deepEqual(ids('sales-export-documents'),['e-generated','e-upload']);
assert.deepEqual(ids('documents-domestic-documents'),['d-child','d-upload']);
assert.deepEqual(ids('documents-generated-documents'),['e-generated']);
assert.deepEqual(ids('documents-uploaded-documents'),['cycle-file','d-child','d-upload','e-upload','master-file','purchase-file']);
assert.deepEqual(ids('documents-transaction-documents'),['cycle-file','d-child','d-upload','e-generated','e-upload','purchase-file']);
assert.deepEqual(ids('documents-export-documents','2025–26'),['old-file']);
const result=reports.documentReportScope(files,data,'documents-uploaded-documents','2026–27');
assert.equal(result.unscopedCount,2,'missing and undated links must be reported, never assigned upload year');
assert.equal(result.masterCount,1);
assert.deepEqual(reports.documentReportScope([],data,'documents-export-documents','2026–27').rows,[],'missing required files must not become downloadable entries');
console.log('Document report FY, domain, origin and missing/undated checks passed.');
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',outfile:'.test-output/document-report-scope.mjs'});
try { await import('../.test-output/document-report-scope.mjs'); }
finally { await rm('.test-output/document-report-scope.mjs'); }
