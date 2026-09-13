import { createRequire } from 'node:module';
import { mkdir, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PDFDocument, decodePDFRawStream } from 'pdf-lib';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
await mkdir('.test-output', { recursive: true });
const output = '.test-output/pdf-pagination.mjs';
await require('esbuild').build({ entryPoints: ['lib/server/pdf-document.ts'], outfile: output,
  bundle: true, platform: 'node', format: 'esm', packages: 'external' });
try {
  const { pdfDocument } = await import('../' + output);
  const lines = Array.from({ length: 180 }, (_, i) => `ROW-${String(i).padStart(3, '0')} Product description and shipment details`);
  const bytes = await pdfDocument({ title: 'Customer invoice', company: { name: 'Test exporter' }, lines });
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() > 3, 'Long invoices must paginate');
  const content = doc.getPages().flatMap(page => page.node.Contents().asArray().map(ref =>
    new TextDecoder().decode(decodePDFRawStream(doc.context.lookup(ref)).decode()))).join('\n');
  for (let i = 0; i < 180; i++) {
    const marker = Buffer.from(`ROW-${String(i).padStart(3, '0')}`).toString('hex').toUpperCase();
    assert.ok(content.includes(marker), `Missing row ${i}`);
  }
  console.log('PASS: all 180 rows retained across ' + doc.getPageCount() + ' PDF pages');
} finally { await rm(output, { force: true }); }
