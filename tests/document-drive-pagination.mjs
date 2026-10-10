import { createRequire } from 'node:module';
import { mkdir, readFile, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { build } = require('esbuild');
await mkdir('.test-output', { recursive: true });
// A small hook runner exercises the actual private drive component without a browser.
await build({entryPoints:['components/shipzy-workspace.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',outfile:'.test-output/document-drive-pagination.mjs',plugins:[{
  name:'drive-hooks',setup(build){
    build.onLoad({filter:/components\/shipzy-workspace\.tsx$/},async args=>({contents:(await readFile(args.path,'utf8'))+'\nexport { ShipzyDrive };',loader:'tsx'}));
    build.onResolve({filter:/^react$/},args=>args.importer.endsWith('/components/shipzy-workspace.tsx')?{path:'drive-hooks',namespace:'test'}:undefined);
    build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const useState=(v)=>globalThis.driveHooks.useState(v);export const useEffect=(f,d)=>globalThis.driveHooks.useEffect(f,d);export const useRef=(v)=>({current:v});',loader:'js'}));
  }
}]});
const state=[],deps=[];let cursor=0,pending=[],dirty=false;
globalThis.driveHooks={
  useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;dirty=true;}];},
  useEffect(callback,next){const i=cursor++;if(!deps[i]||next.some((v,j)=>!Object.is(v,deps[i][j]))){deps[i]=next;pending.push(callback);}}
};
function descendants(node,predicate){if(!node||typeof node!=='object')return[];if(Array.isArray(node))return node.flatMap(n=>descendants(n,predicate));return[...(predicate(node)?[node]:[]),...descendants(node.props?.children,predicate)];}
try {
  const {ShipzyDrive}=await import('../.test-output/document-drive-pagination.mjs');
  const records=[...Array.from({length:12},(_,i)=>({id:'old-'+i,kind:'invoices',fy:'2025–26',reference:'OLD-'+i})),{id:'new',kind:'invoices',fy:'2026–27',reference:'NEW-ONLY'}];
  const render=fy=>{let tree;do{dirty=false;cursor=0;pending=[];tree=ShipzyDrive({records,fy,route:'documents-drive',go:()=>{}});for(const effect of pending)effect();}while(dirty);return tree;};
  const first=render('2025–26');
  const next=descendants(first,n=>n.props?.children==='Next')[0];
  next.props.onClick();
  assert.equal(descendants(render('2025–26'),n=>n.type==='tr').length,3,'second page should contain two invoices and header');
  const changed=render('2026–27');
  assert.equal(descendants(changed,n=>n.type==='tr').length,2,'changing FY must show first page with its invoice');
  const previous=descendants(changed,n=>n.props?.children==='Previous')[0];
  assert.equal(previous.props.disabled,true,'first page after FY change must disable Previous');
  console.log('Document drive resets pagination on FY change.');
} finally {delete globalThis.driveHooks;await rm('.test-output/document-drive-pagination.mjs');}
