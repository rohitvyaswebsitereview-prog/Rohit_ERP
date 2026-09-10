import { createRequire } from 'node:module';
import { mkdir, rm } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
await mkdir('.test-output', { recursive: true });
await build({
  stdin: {
    contents: `
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {RecordSummary} from './components/record-summary';
const record={id:'invoice-1',kind:'invoices',reference:'INV-01',fy:'2026–27',date:'2026-04-01',currency:'INR',amount:118000,importBatch:'internal-batch-secret',importLocked:true,partnerId:'customer-1',sourceStatus:'BL awaited',lines:[{description:'Equipment <test>',quantity:2,basic:100000,gst:18000,total:118000}]};
const data={record,records:[record,{id:'customer-1',kind:'customers',name:'Example Customer'}],financial:{lines:[{id:'invoice-1',currency:'USD',amount:6500000,settled:1500000,balance:5000000}]},pending:[]};
const html=renderToStaticMarkup(React.createElement(RecordSummary,{data,go:()=>{},section:()=>{}}));
assert.ok(html.includes('Example Customer'));
const itemHtml=renderToStaticMarkup(React.createElement(RecordSummary,{data,go:()=>{},section:()=>{},items:true}));
assert.ok(itemHtml.includes('Equipment &lt;test&gt;'));
assert.ok(!html.includes('Equipment &lt;test&gt;'));
assert.ok(html.includes('BL awaited'));
assert.ok(html.includes('65,000.00')||html.includes('65,000'));
assert.ok(html.includes('50,000.00')||html.includes('50,000'));
assert.ok(itemHtml.includes('INR'));
assert.ok(!itemHtml.includes('USD'));
assert.ok(html.includes('USD'));
assert.ok(!html.includes('internal-batch-secret'));
assert.ok(!html.includes('Import batch'));
const empty=renderToStaticMarkup(React.createElement(RecordSummary,{data:{record:{id:'c',kind:'customers',name:'New customer'},records:[],pending:[]},go:()=>{},section:()=>{}}));
assert.ok(empty.includes('New customer'));
assert.ok(!empty.includes('NaN'));
console.log('13 record presentation checks passed.');
`,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  outfile: '.test-output/record-summary.mjs',
});
await import('../.test-output/record-summary.mjs');
await rm('.test-output/record-summary.mjs');
