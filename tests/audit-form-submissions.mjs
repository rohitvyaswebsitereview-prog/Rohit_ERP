import ts from 'typescript';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';

// A submit button rendered as an ordinary button cannot reach its form handler.
// Check every application form, including conditional branches, rather than a label snapshot.
const failures=[]; let forms=0;
for(const file of readdirSync('components').filter(f=>f.endsWith('.tsx'))){
 const source=ts.createSourceFile(file,readFileSync('components/'+file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function walk(node,inForm=false){
  const element=ts.isJsxElement(node)?node.openingElement:ts.isJsxSelfClosingElement(node)?node:null;
  if(element){
   const tag=element.tagName.getText(source);
   if(tag==='form'){forms++;inForm=true;}
   if(inForm&&['Button','button'].includes(tag)){
    const attrs=element.attributes.properties;
    const explicit=attrs.some(a=>ts.isJsxAttribute(a)&&a.name.getText(source)==='type');
    if(!explicit){const line=source.getLineAndCharacterOfPosition(element.pos).line+1;failures.push(file+':'+line+' '+element.getText(source));}
   }
  }
  ts.forEachChild(node,c=>walk(c,inForm));
 }
 walk(source);
}
assert.ok(forms>=10,'Inventory must cover application forms');
assert.deepEqual(failures,[], 'Every button inside a form must explicitly choose submit or button');
console.log('PASS explicit button semantics across '+forms+' application forms');
