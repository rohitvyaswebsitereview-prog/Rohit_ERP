import {createRequire} from 'node:module';
import {mkdir,rm} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild'),{Miniflare}=require('miniflare');
await mkdir('.test-output/company-save',{recursive:true});
await build({stdin:{contents:"import {handle} from './lib/server/service.ts';export default {fetch:handle};",resolveDir:process.cwd()},bundle:true,mainFields:['module','main'],format:'esm',platform:'neutral',external:['cloudflare:workers'],outfile:'.test-output/company-save/worker.mjs'});
const mf=new Miniflare({modules:true,scriptPath:'.test-output/company-save/worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'company-test'},r2Buckets:['FILES']});
let cookie='';
async function call(path,body){
 const r=await mf.dispatchFetch('http://localhost/api/v1/'+path,{headers:{Cookie:cookie,Origin:'http://localhost','Content-Type':'application/json'},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};
}
try{
 const setup=await call('setup',{name:'Isolated admin',email:'test@example.test',password:'Isolated-test-only-password'});
 assert.equal(setup.status,200);cookie=setup.cookie.split(';')[0];
 const invalid=await call('operations/master-company-information',{name:'   '});
 assert.equal(invalid.status,400);assert.match(invalid.data.error,/company name|required/i);
 assert.equal((await call('records')).data.filter(r=>r.kind==='master-company-information').length,0);
 const payload={name:'Isolated Test Company',tradeName:'Test Trading',email:'company@example.test',phone:'0000000000',website:'https://example.test',address:'Test address',country:'India',authorizedSignatory:'Test signatory',invoicePrefix:'TEST',customsPrefix:'TEST-C',footerText:'Test footer'};
 const created=await call('operations/master-company-information',payload);
 assert.equal(created.status,201,JSON.stringify(created.data));
 const id=created.data.id;
 let row=(await call('operations/master-company-information/'+id)).data.record;
 for(const [key,value] of Object.entries(payload))assert.equal(row[key],value,key+' must persist');
 const saved=await call('operations/master-company-information/'+id+'/save',{...payload,tradeName:'Updated trading name',reason:'Isolated verification',version:row.version});
 assert.equal(saved.status,200,JSON.stringify(saved.data));
 const stale=await call('operations/master-company-information/'+id+'/save',{...payload,reason:'Isolated stale update',version:row.version});
 assert.equal(stale.status,409,'Stale company edit must not overwrite newer data');
 row=(await call('records')).data.find(r=>r.id===id);
 assert.equal(row.tradeName,'Updated trading name');assert.equal(row.email,payload.email);assert.equal(row.footerText,payload.footerText);
 const dashboard=await call('dashboard?fy=2026%E2%80%9327&start=2026-04-01&end=2026-10-10');
 assert.equal(dashboard.status,200);assert.deepEqual(dashboard.data.recorded.totals,[]);
 console.log('PASS company required fields, creation, all sections persist, edit, stale-save protection and dashboard response');
}finally{await mf.dispose();await rm('.test-output/company-save',{recursive:true,force:true});}
