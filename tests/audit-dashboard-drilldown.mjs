import {createRequire} from 'node:module';
import {mkdir,rm} from 'node:fs/promises';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild');
await mkdir('.test-output/dashboard-drilldown',{recursive:true});
await build({stdin:{contents:`
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import assert from 'node:assert/strict';
import {ManagementDashboard} from './components/management-dashboard';import Dashboard from './components/dashboard';
import {RecordedBusinessOverview,RecordedBusinessReport} from './components/recorded-business';import {recordedBusiness} from './lib/domain';
const records=[{id:'export',kind:'invoices',fy:'2026–27',reference:'USD-INCLUDED',date:'2026-05-01',status:'Imported',importLocked:true,amount:999999,currency:'INR',totalUsd:125},
{id:'domestic',kind:'domestic-invoices',fy:'2026–27',reference:'INR-EXCLUDED',date:'2026-05-01',status:'Imported',importLocked:true,amount:30000,currency:'INR'},
{id:'future',kind:'invoices',fy:'2026–27',reference:'FUTURE-EXCLUDED',date:'2026-07-01',status:'Imported',importLocked:true,amount:999999,currency:'INR',totalUsd:500}];
function find(node,fn){if(!node||typeof node!=='object')return[];if(Array.isArray(node))return node.flatMap(n=>find(n,fn));return [...(fn(node)?[node]:[]),...find(node.props?.children,fn)];}
globalThis.periodIndex=0;let destination;
const parent=ManagementDashboard({records,fy:'2026–27',role:'Admin',revision:0,go:route=>destination=route,refresh:()=>{},updatedAt:''});
const child=find(parent,node=>node.type===Dashboard)[0];assert.ok(child);
const overview=RecordedBusinessOverview({data:recordedBusiness(records,child.props.start,child.props.end),go:child.props.go});
const usd=find(overview,node=>node.type==='button'&&node.key==='USD')[0];assert.ok(usd);usd.props.onClick();
const params=new URLSearchParams(destination.split('?')[1]);assert.equal(destination.split('?')[0],'business-records');
for(const [key,value] of Object.entries({metric:'sales',currency:'USD',from:'2026-04-01',to:'2026-06-30',fy:'2026–27'}))assert.equal(params.get(key),value);
globalThis.window={location:{search:'?'+params.toString()}};
const report=renderToStaticMarkup(React.createElement(RecordedBusinessReport,{records,fy:'2026–27',go:()=>{},role:'Admin'}));
assert.ok(report.includes('$125.00'));assert.ok(report.includes('USD-INCLUDED'));assert.ok(!report.includes('INR-EXCLUDED'));assert.ok(!report.includes('FUTURE-EXCLUDED'));
const restricted=renderToStaticMarkup(React.createElement(RecordedBusinessReport,{records,fy:'2026–27',go:()=>{},role:'Logistics'}));assert.ok(restricted.includes('Access restricted'));assert.ok(!restricted.includes('$125'));
console.log('PASS real overview click → period/year/currency/metric filters → matching rendered report, restricted role denied');
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',packages:'external',jsx:'automatic',outfile:'.test-output/dashboard-drilldown/test.mjs',plugins:[{name:'period-hooks',setup(build){build.onResolve({filter:/^react$/},args=>args.importer.endsWith('/components/management-dashboard.tsx')?{path:'period-hooks',namespace:'test'}:undefined);build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"export function useState(v){return [['Custom Period','2026-04-01','2026-06-30'][globalThis.periodIndex++],()=>{}];}",loader:'js'}));}}]});
try{await import('../.test-output/dashboard-drilldown/test.mjs');}finally{await rm('.test-output/dashboard-drilldown',{recursive:true,force:true});}
