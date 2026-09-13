import { createRequire } from 'node:module';
import { mkdir, rm } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
await mkdir('.test-output', { recursive: true });
await build({
  stdin: {
    resolveDir: process.cwd(),
    contents: `
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {shipzyMenus} from './lib/shipzy-navigation';
import {opMap,operationRoutes} from './lib/operations';
import {masterReadiness} from './lib/master-readiness';
import {receivableAgeing} from './lib/receivable-ageing';
import {ShipzyRegister,ShipzyMasters,ShipzyPayments} from './components/shipzy-workspace';
let count=0;function check(label,fn){fn();count++;console.log('PASS '+label)}
check('Ageing treats missing and invalid due dates separately',()=>{
  for(const date of [undefined,'','2026-02-30','not-a-date']) assert.equal(receivableAgeing(date,'2026-09-13'),'No due date');
});
check('Ageing boundaries use due date rather than invoice date',()=>{
  const today='2026-09-13';
  for(const [days,bucket] of [[0,'Current'],[-1,'Current'],[1,'1-30'],[30,'1-30'],[31,'31-60'],[60,'31-60'],[61,'61-90'],[90,'61-90'],[91,'90+']]) {
    assert.equal(receivableAgeing(new Date(Date.parse(today)-days*86400000).toISOString().slice(0,10),today),bucket);
  }
});
const custom=new Set(['dashboard','export-docs','pre-shipment','post-shipment','packing-drive','shipment-checklist','documents-drive','costing','reports','masters','logistics-master','profile','users','administration-permissions','receivables','payables','inventory-stock-register']);
check('Every sidebar destination resolves to a working screen',()=>{for(const menu of shipzyMenus)for(const r of menu.children?menu.children.map(c=>c[0]):[menu.route])assert.ok(opMap[operationRoutes[r]||r]||custom.has(r),'Missing '+r)});
const r={id:'i',kind:'invoices',reference:'INV-TEST',fy:'2026–27',date:'2026-04-01',status:'Imported',importLocked:true,customerName:'Customer <test>',currency:'INR',amount:118000,lines:[{description:'Excavator',quantity:1,uom:'NOS'}]};
check('Receivables drill-through preserves currency, search and ageing',()=>{
  const records=[{...r,id:'a',reference:'MATCH-OVERDUE',dueDate:'2020-01-01'},
    {...r,id:'b',reference:'MATCH-OTHER-CURRENCY',currency:'USD',dueDate:'2020-01-01'},
    {...r,id:'c',reference:'MATCH-NO-DUE-DATE'},
    {...r,id:'d',reference:'EXCLUDED-BY-SEARCH',dueDate:'2020-01-01'}];
  const page=renderToStaticMarkup(React.createElement(ShipzyPayments,{records,fy:r.fy,go:()=>{},initialQuery:'currency=INR&q=MATCH&ageing=90%2B&outstanding=1'}));
  assert.ok(page.includes('MATCH-OVERDUE'));
  for(const value of ['MATCH-OTHER-CURRENCY','MATCH-NO-DUE-DATE','EXCLUDED-BY-SEARCH'])assert.ok(!page.includes(value));
});
const html=renderToStaticMarkup(React.createElement(ShipzyRegister,{records:[r],fy:'2026–27',kind:'invoices',go:()=>{},user:{role:'Admin'}}));
check('Imported data remains visible without changing a hidden view',()=>assert.ok(html.includes('INV-TEST')));
check('Register follows action/doc/consignee/product columns',()=>{for(const text of ['ACTION','DOC','CONSIGNEE','PRODUCTS','STATUS'])assert.ok(html.includes(text))});
check('Business text is escaped',()=>assert.ok(html.includes('Customer &lt;test&gt;')));
check('Product description is available directly in the list',()=>assert.ok(html.includes('Excavator')));
check('Old process workspace does not render in the register',()=>{assert.ok(!html.includes('lifecycle-controller'));assert.ok(!html.includes('record-next-action'))});
const master=renderToStaticMarkup(React.createElement(ShipzyMasters,{role:'Admin',go:()=>{}}));
check('Catalog includes BOM and advisory setup progress',()=>{assert.ok(master.includes('BOM'));assert.ok(master.includes('Setup checklist'));assert.ok(master.includes('0 of 6 ready'))});
check('Inactive master records do not satisfy setup',()=>{
  const items=masterReadiness([{kind:'products',status:'Inactive'}], 'Admin');
  assert.equal(items.find(i=>i.key==='products').ready,false);
});
check('Company readiness requires branding on one complete profile',()=>{
  const items=masterReadiness([{kind:'master-company-information',name:'Exporter',address:'Office',email:'test@example.com'},
    {kind:'master-company-information',logoDataUrl:'logo',signatureDataUrl:'signature',authorizedSignatory:'Owner'}], 'Admin');
  assert.equal(items.find(i=>i.key==='company-information').ready,false);
});
check('Setup checklist respects role visibility',()=>{
  assert.ok(!masterReadiness([], 'Logistics').some(i=>i.key==='company-information'));
  assert.ok(!masterReadiness([], 'Finance').some(i=>i.key==='products'));
});
check('Master Settings follows the reference grouping',()=>{for(const t of ['Company &amp; Document Setup','Product &amp; Packaging','Trade &amp; Partners','Terms &amp; Templates','Licenses &amp; Compliance','User Management'])assert.ok(master.includes(t),t)});
check('Bank and packaging masters remain reachable',()=>{assert.ok(master.includes('Bank Details'));assert.ok(master.includes('Packaging Materials'))});
const viewer=renderToStaticMarkup(React.createElement(ShipzyRegister,{records:[r],fy:'2026–27',kind:'invoices',go:()=>{},user:{role:'Viewer'}}));
check('Read-only role has no Add New button',()=>assert.ok(!viewer.includes('Add New')));
console.log(count+' Shipzy layout checks passed');
`,
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  outfile: '.test-output/shipzy.mjs',
});
await import('../.test-output/shipzy.mjs');
await rm('.test-output/shipzy.mjs');
