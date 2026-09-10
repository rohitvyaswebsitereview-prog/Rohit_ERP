import { createRequire } from 'node:module';
import { mkdir, rm } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
await mkdir('.test-output', { recursive: true });
await build({
  stdin: {
    resolveDir: process.cwd(),
    contents: `
import assert from 'node:assert/strict';
import {lifecycle,transactionScope,inDataView,sourceState,processState,workspaceRows} from './lib/workflow';
import {inferRelationships} from './lib/relationships';
import {processModules} from './lib/workspace-navigation';
import {opMap,operationRoutes} from './lib/operations';
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS '+name)};
const invoice={id:'i',kind:'invoices',status:'Imported',sourceStatus:'CUSTOMER CHECK BL / BL AWAITED',totalUsd:1000,currency:'INR',amount:9000000,partnerId:'c'};
const records=[invoice,{id:'c',kind:'customers',name:'Customer'},{id:'sb',kind:'shipping-bills',status:'Final',sourceId:'i'},{id:'bl',kind:'bills-of-lading',status:'Final',sourceId:'i'},{id:'p',kind:'packing-lists',status:'Final',sourceId:'i'},{id:'r',kind:'receipts',status:'Imported',sourceId:'i',currency:'USD',amount:100000},{id:'other',kind:'invoices',partnerId:'c',status:'Imported',totalUsd:4000},{id:'other-bank',kind:'forex',sourceId:'other',status:'Final',bankReference:'OTHER'}];
const edges=inferRelationships(records),scope=transactionScope(invoice,records,edges),flow=lifecycle(invoice,scope);
check('Invoice scope excludes other customer invoices and bank evidence',()=>{assert.ok(!scope.some(r=>r.id==='other'));assert.ok(!scope.some(r=>r.id==='other-bank'))});
check('Customer-approved BL is the next missing action',()=>assert.equal(flow.next.action,'Obtain customer-approved bill of lading'));
check('Export rail has five ordered stages',()=>assert.deepEqual(flow.stages.map(s=>s.key),['commercial','documents','shipment','realisation','closure']));
check('Bank realisation remains pending without evidence',()=>assert.ok(flow.stages.find(s=>s.key==='realisation').exceptions.includes('Bank realisation')));
check('Draft financial evidence does not satisfy bank stage',()=>{const f=lifecycle(invoice,[...scope,{id:'draft',kind:'forex',status:'Draft',bankReference:'DRAFT'}]);assert.ok(f.stages.find(s=>s.key==='realisation').exceptions.includes('Bank realisation'))});
check('Cancelled financial evidence does not satisfy bank stage',()=>{const f=lifecycle(invoice,[...scope,{id:'cancel',kind:'forex',status:'Cancelled',bankReference:'CANCEL'}]);assert.ok(f.stages.find(s=>s.key==='realisation').exceptions.includes('Bank realisation'))});
check('Source and process states are independent',()=>{assert.equal(sourceState(invoice),'Imported');assert.equal(processState(invoice),'Awaiting')});
check('Data views partition source states correctly',()=>{assert.ok(!inDataView(invoice,'Operational'));assert.ok(inDataView(invoice,'Imported / Migration'));assert.ok(inDataView({dataState:'Historical'},'Historical only'));assert.ok(inDataView({},'Operational'));assert.ok(!inDataView(invoice,'Operational + Historical'))});
check('Profiles never inherit a shipment checklist',()=>assert.equal(lifecycle(records[1],records).stages.length,0));
check('Draft invoice is not shown completed',()=>assert.equal(lifecycle({...invoice,status:'Draft'},[{...invoice,status:'Draft'}]).status,'Draft'));
check('Sold machine does not imply delivery',()=>{const f=lifecycle({id:'m',kind:'machines',status:'Sold'},[{id:'m',kind:'machines',status:'Sold'}]);assert.notEqual(f.stages.find(s=>s.key==='delivered').status,'Completed')});
check('Converted quotations do not duplicate invoice workspaces',()=>{const rs=[...records,{id:'q',kind:'quotations',status:'Converted'},{...invoice,id:'converted',sourceId:'q'}];assert.ok(!workspaceRows(rs,inferRelationships(rs)).some(r=>r.id==='q'))});
const custom=new Set(['transactions','documents-drive','my-work','work-calendar','document-inbox','workbook-data','audit','users','settings','data-dictionary','all-tools','architecture-map','reconciliation','receivables','payables','inventory-stock-register']);
check('Every module link resolves to an implemented route',()=>{for(const m of Object.values(processModules))for(const [r]of m.pages){const key=r.split('?')[0];assert.ok(opMap[operationRoutes[key]||key]||custom.has(key),'Unresolved route '+key)}});
console.log(passed+' workflow checks passed.');
`,
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  outfile: '.test-output/workflow.mjs',
});
await import('../.test-output/workflow.mjs');
await rm('.test-output/workflow.mjs');
