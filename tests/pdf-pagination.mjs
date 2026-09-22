import { createRequire } from 'node:module';
import { mkdir, rm, writeFile } from 'node:fs/promises';
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
  const tableBytes = await pdfDocument({ title: 'Commercial Invoice', subtitle: 'QA-2026-001',
    company: {name: "Rohit's ERP - test exporter", address: 'Test address, Mumbai, India'},
    lines: ['Invoice date: 22 September 2026', 'Consignee: Sample buyer', 'Currency: USD'],
    table: { headers: ['No.', 'Description of goods', 'HSN', 'Quantity', 'Unit', 'Unit rate', 'Amount (USD)'], widths: [24,175,55,45,40,75,85],
      rows: Array.from({length:100},(_,i)=>[String(i+1), 'ITEM-'+String(i).padStart(3,'0')+' Industrial equipment with detailed packaging instructions', '8429', '2', 'PCS', '1500.00', '3000.00']) },
    afterTable: ['Grand total: USD 300000.00'] });
  const tableDoc=await PDFDocument.load(tableBytes);
  assert.ok(tableDoc.getPageCount()>2);
  const pageContent=tableDoc.getPages().map(page=>page.node.Contents().asArray().map(ref=>new TextDecoder().decode(decodePDFRawStream(tableDoc.context.lookup(ref)).decode())).join(''));
  const contentAll=pageContent.join('');
  for(let i=0;i<100;i++) assert.ok(contentAll.includes(Buffer.from('ITEM-'+String(i).padStart(3,'0')).toString('hex').toUpperCase()),'Missing invoice table item '+i);
  for(const page of pageContent.filter(p=>p.includes(Buffer.from('ITEM-').toString('hex').toUpperCase()))) assert.ok(page.includes(Buffer.from('Description of goods').toString('hex').toUpperCase()),'Missing repeated table header');
  assert.ok(contentAll.includes(Buffer.from('Grand total: USD 300000.00').toString('hex').toUpperCase()));
  await mkdir('tmp/pdfs',{recursive:true});
  await writeFile('tmp/pdfs/invoice-table-qa.pdf',tableBytes);
  console.log('PASS: all 100 invoice table rows, repeated headers and grand total retained across '+tableDoc.getPageCount()+' pages');
} finally { await rm(output, { force: true }); }
