import {createRequire} from 'node:module';
import {mkdir,rm} from 'node:fs/promises';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild');
await mkdir('.test-output/editor-cancel',{recursive:true});
await build({stdin:{contents:`
import assert from 'node:assert/strict';import Operations from './components/operations';
globalThis.window={location:{search:''}};
function find(node,fn){if(!node||typeof node!=='object')return[];if(Array.isArray(node))return node.flatMap(n=>find(n,fn));return [...(fn(node)?[node]:[]),...find(node.props?.children,fn)];}
for(const id of [null,'existing-company']){
 globalThis.editorIndex=0;globalThis.editorId=id;let destination;
 const tree=Operations({kind:'master-company-information',presentation:'shipzy',user:{role:'Admin'},fy:'2026–27',go:r=>destination=r,refreshParent:()=>{}});
 const cancel=find(tree,n=>n.props?.children==='Cancel')[0];assert.ok(cancel);assert.equal(cancel.props.type,'button');cancel.props.onClick();
 assert.equal(destination,'master-company-information'+(id?'?record='+id:''),'Cancel must leave create/edit URL and return to the correct list or existing record');
}
console.log('PASS actual create/edit Cancel handlers return to company list or existing detail');
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',packages:'external',jsx:'automatic',outfile:'.test-output/editor-cancel/test.mjs',plugins:[{name:'editor-state',setup(build){
build.onResolve({filter:/^react$/},args=>args.importer.endsWith('/components/operations.tsx')?{path:'editor-hooks',namespace:'test'}:undefined);
build.onResolve({filter:/^\.\/data-view$/},args=>args.importer.endsWith('/components/operations.tsx')?{path:'editor-view',namespace:'test'}:undefined);
build.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='editor-view'?"export const useDataView=()=>({includes:()=>true});":"export function useState(v){const i=globalThis.editorIndex++;if(i===1)return [false,()=>{}];if(i===5)return [globalThis.editorId,()=>{}];if(i===6)return [globalThis.editorId?{record:{id:globalThis.editorId,name:'Test company'}}:null,()=>{}];if(i===7)return [true,()=>{}];return [v,()=>{}];}export function useEffect(){}",loader:'js'}));
}}]});
try{await import('../.test-output/editor-cancel/test.mjs');}finally{await rm('.test-output/editor-cancel',{recursive:true,force:true});}
