import { createRequire } from 'node:module';
import { mkdir, rm } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
await mkdir('.test-output', { recursive: true });
await build({stdin:{contents:`
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import * as controls from './components/shipzy-workspace';
const records=['DBK','RoDTEP','IGST refund'].map((scheme,i)=>({id:'claim-'+i,kind:'incentives',reference:'CLAIM-'+i,fy:'2026–27',date:'2026-04-01',status:'Draft',currency:'INR',amount:100,scheme}));
for (const [scheme,reference] of [['DBK','CLAIM-0'],['RoDTEP','CLAIM-1'],['IGST refund','CLAIM-2']]) {
 const html=renderToStaticMarkup(React.createElement(controls.ShipzyRegister,{initialQuery:new URLSearchParams({scheme}).toString(),records,fy:'2026–27',kind:'incentives',go:()=>{},user:{role:'Admin'}}));
 assert.ok(html.includes(reference));
 for(const other of records.filter(r=>r.scheme!==scheme)) assert.ok(!html.includes(other.reference),'scheme filter must exclude '+other.reference+' for '+scheme);
}
const all=renderToStaticMarkup(React.createElement(controls.ShipzyRegister,{records,fy:'2026–27',kind:'incentives',go:()=>{},user:{role:'Admin'}}));
assert.ok(records.every(r=>all.includes(r.reference)));
console.log('Incentive scheme filters passed.');
assert.equal(typeof controls.submitPasswordChange,'function','active workspace needs a password submit action');
let logoutCount=0,request;
globalThis.fetch=async (url,options)=>{request={url,options};return {ok:true,json:async()=>({ok:true})};};
await controls.submitPasswordChange('old password','new password 123',()=>logoutCount++);
assert.equal(request.url,'/api/v1/password');
assert.deepEqual(JSON.parse(request.options.body),{current:'old password',password:'new password 123'});
assert.equal(logoutCount,1,'successful password change must sign out');
globalThis.fetch=async()=>({ok:false,status:400,json:async()=>({error:'Current password is incorrect.'})});
await assert.rejects(()=>controls.submitPasswordChange('wrong','new password 123',()=>logoutCount++),/Current password is incorrect/);
assert.equal(logoutCount,1,'failed password change must keep session open');
assert.equal(typeof controls.PasswordChangeForm,'function');
const form=renderToStaticMarkup(React.createElement(controls.PasswordChangeForm,{onDone:()=>{}}));
assert.ok(form.includes('type="submit"'));
assert.match(form,/autocomplete="current-password"/i);
assert.match(form,/autocomplete="new-password"/i);
assert.ok(form.includes('minLength="12"')||form.includes('minlength="12"'));
console.log('Password form and successful/failed submit checks passed.');
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',outfile:'.test-output/page-controls.mjs'});
try { await import('../.test-output/page-controls.mjs'); }
finally { await rm('.test-output/page-controls.mjs'); }
