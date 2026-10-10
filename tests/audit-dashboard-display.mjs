import {createRequire} from 'node:module';
import {mkdir,rm} from 'node:fs/promises';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild');
await mkdir('.test-output/dashboard-display',{recursive:true});
await build({stdin:{contents:`
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import assert from 'node:assert/strict';
import Dashboard from './components/dashboard';
globalThis.fixture={totals:[],recorded:{totals:[{metric:'sales',currency:'USD',amount:12500,count:1}],rows:[],excluded:0}};
const render=()=>{globalThis.widgetIndex=0;return renderToStaticMarkup(React.createElement(Dashboard,{fy:'2026–27',start:'2026-04-01',end:'2026-10-10',revision:0,go:()=>{},records:[],role:'Admin'}));};
const empty=render();assert.ok(empty.includes('$125.00'));assert.ok(empty.includes('No posted account balances'));
assert.ok(!empty.includes('Display currency'),'Currency selector must not promise filtering when there is no posted ledger to filter');
globalThis.fixture={...globalThis.fixture,totals:[{currency:'INR',sales:100,profit:0,receivables:0,payables:0,cash:0,receipts:0,payments:0,margin:null}]};
assert.ok(render().includes('Display currency'),'Posted ledger retains its working currency selector');
console.log('PASS rendered imported figures, clear ledger-empty state, and conditional currency control');
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',packages:'external',jsx:'automatic',outfile:'.test-output/dashboard-display/test.mjs',plugins:[{name:'dashboard-data',setup(build){build.onResolve({filter:/^react$/},args=>args.importer.endsWith('/components/dashboard.tsx')?{path:'dashboard-data',namespace:'test'}:undefined);build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"export function useState(v){if(v&&typeof v==='object'&&'loading' in v){const i=globalThis.widgetIndex++;return [{data:i===0?globalThis.fixture:[],error:'',loading:false},()=>{}];}return [v,()=>{}];} export function useEffect(){}",loader:'js'}));}}]});
try{await import('../.test-output/dashboard-display/test.mjs');}finally{await rm('.test-output/dashboard-display',{recursive:true,force:true});}
