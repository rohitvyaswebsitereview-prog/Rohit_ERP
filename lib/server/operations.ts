import { opMap, operationModules, permittedOperation, initialStatus, calculateLines } from '../operations';
import { fiscalYear, validDate, moneyMinor, assertBalanced } from '../domain';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const parse=(r:any)=>({...JSON.parse(r.data),id:r.id,kind:r.kind,version:r.version,created:r.created,fy:r.fy});
const clean=(v:any,max=2000)=>String(v??'').trim().slice(0,max);
const today=()=>new Date().toISOString();
const makeId=()=>crypto.randomUUID();
const references:Record<string,string[]>={'sales-invoice':['invoices','domestic-invoices'],'purchase-payable':['purchase-invoices','expenses','bills'],'delivery-source':['invoices','domestic-invoices','purchase-invoices']};
export async function operations(req:Request,path:string,b:any,u:any,db:any,bucket:any):Promise<Response>{
 const url=new URL(req.url);const parts=path.split('/');const kind=parts[1],rid=parts[2],action=parts[3];
 const rawAll=await db.prepare('SELECT * FROM records WHERE tenant_id=? ORDER BY created DESC').bind(u.tenant_id).all();
 const all=rawAll.results.map(parse);
 const visible=(r:any)=>opMap[r.kind]&&permittedOperation(opMap[r.kind],u.role);
 const redact=(r:any)=>{if(u.role!=='Viewer')return r;const out={...r};for(const k of ['accountNumber','pan','gstin','customerGstin','taxRegistrations'])if(out[k])out[k]='••••'+String(out[k]).slice(-4);return out;};
 const event=(name:string,k:string,id:string,detail:any)=>db.prepare('INSERT INTO audit VALUES (?,?,?,?,?,?,?,?)').bind(makeId(),u.tenant_id,u.id,name,id,k,JSON.stringify(detail),today());
 const saveNew=(k:string,data:any,id=makeId())=>db.prepare('INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES(?,?,?,?,?,?)').bind(id,u.tenant_id,k,opMap[k]?.master?'master':data.date?fiscalYear(data.date):'master',JSON.stringify(data),today());
 const find=(id:string,k?:string)=>all.find((r:any)=>r.id===id&&(!k||r.kind===k));
 if(kind==='catalogue'&&req.method==='GET')return json(operationModules.filter(m=>permittedOperation(m,u.role)));
 if(kind==='data'&&req.method==='GET')return json(all.filter(visible).map(redact));
 if(kind==='documents'&&req.method==='GET'){
  const docs=all.filter((r:any)=>r.kind==='op-document'&&find(r.entityId)&&visible(find(r.entityId)));
  if(rid){const doc=docs.find((r:any)=>r.id===rid);if(!doc)return json({error:'Document not found.'},404);const file=await bucket?.get(doc.objectKey);if(!file)return json({error:'File is unavailable.'},404);return new Response(file.body,{headers:{'Content-Type':doc.mime,'Content-Disposition':`attachment; filename="${doc.filename.replace(/[^a-zA-Z0-9._-]/g,'_')}"`,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});}
  return json(docs.map(({objectKey,...r}:any)=>r));
 }
 const m=opMap[kind];if(!m||!permittedOperation(m,u.role))return json({error:'Page unavailable for your role.'},403);
 if(req.method==='GET'&&!rid)return json(all.filter((r:any)=>r.kind===kind).map(redact));
 const existing=rid?find(rid,kind):null;
 if(rid&&!existing)return json({error:'Record not found.'},404);
 if(req.method==='GET'){
  const history=await db.prepare('SELECT a.*,u.name actor FROM audit a LEFT JOIN users u ON a.user_id=u.id WHERE a.tenant_id=? AND a.record_id=? ORDER BY a.created DESC').bind(u.tenant_id,rid).all();
  const documents=all.filter((r:any)=>r.kind==='op-document'&&r.entityId===rid).map(({objectKey,...r}:any)=>r);
  return json({record:redact(existing),audit:u.role==='Viewer'?history.results.map((r:any)=>({...r,detail:'Details restricted to authorised editors.'})):history.results,documents,related:all.filter((r:any)=>visible(r)&&(r.sourceId===rid||r.invoiceId===rid||r.partnerId===rid||r.productId===rid||r.purchaseId===rid||r.id===existing.sourceId||r.id===existing.invoiceId)).map(redact)});
 }
 if(req.method!=='POST')return json({error:'Method not allowed.'},405);
 if(!permittedOperation(m,u.role,true))return json({error:'Your role has read-only access.'},403);
 if(action==='print'||action==='email-draft'){await event(action==='print'?'Printed':'Email draft prepared',kind,rid,{reference:existing.reference||existing.name}).run();return json({ok:true});}
 if(action==='document'){
  if(!bucket)return json({error:'Document storage is unavailable.'},503);
  const category=clean(b.category,100),filename=clean(b.filename,200),mime=clean(b.mime,100);
  if(!category||!filename||!['application/pdf','image/jpeg','image/png','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime))throw new Error('Choose a PDF, PNG, JPEG, text, CSV, Word or Excel file and category.');
  if(typeof b.content!=='string'||b.content.length>7000000)throw new Error('Files must be smaller than 5 MB.');
  const bytes=Uint8Array.from(atob(b.content),c=>c.charCodeAt(0));if(bytes.length>5*1024*1024||!bytes.length)throw new Error('Select a non-empty file up to 5 MB.');
  const did=makeId(),objectKey=`${u.tenant_id}/${rid}/${did}`;
  const version=all.filter((r:any)=>r.kind==='op-document'&&r.entityId===rid&&r.category===category).length+1;
  await bucket.put(objectKey,bytes,{httpMetadata:{contentType:mime}});
  try{await db.batch([saveNew('op-document',{entityId:rid,entityKind:kind,category,filename,mime,size:bytes.length,objectKey,documentVersion:version,tags:clean(b.tags),status:['Draft','Final','Sent'].includes(b.status)?b.status:'Draft',uploadedBy:u.name},did),event('Uploaded',kind,rid,{filename,category,version})]);}catch(e){await bucket.delete(objectKey);throw e;}
  return json({id:did},201);
 }
 if(existing&&Number(b.version)!==existing.version)return json({error:'This record changed. Reload it before saving.'},409);
 const reason=clean(b.reason);if(existing&&!reason)throw new Error('Enter a reason for this change.');
 const conditionalAudit=(name:string,detail:any)=>db.prepare('INSERT INTO audit SELECT ?,?,?,?,?,?,?,? WHERE changes()=1').bind(makeId(),u.tenant_id,u.id,name,rid,kind,JSON.stringify(detail),today());
 const update=async(data:any,name:string,detail:any)=>{const result=await db.batch([db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND tenant_id=? AND version=?').bind(JSON.stringify({...data,updatedAt:today(),updatedBy:u.name}),rid,u.tenant_id,existing.version),conditionalAudit(name,detail)]);if(!result[0].meta.changes)return json({error:'Record changed. Reload before saving.'},409);return json({id:rid});};
 if(action==='status'){
  const status=clean(b.status,80),current=existing.status||initialStatus(m);
  const transitions=m.posting?{Draft:['Posted','Cancelled'],Posted:['Reversed'],Reversed:[],Cancelled:[]}:m.transitions;
  if(!(transitions[current]||[]).includes(status))throw new Error('This status change is not allowed.');
  if(m.key==='master-currency'&&['INR','USD'].includes(existing.code)&&status!=='Active')throw new Error('INR and USD are protected currencies.');
  const dependents=all.filter((r:any)=>r.sourceId===rid||r.invoiceId===rid||r.partnerId===rid||r.productId===rid||r.currencyId===rid||r.paymentTermsId===rid||r.shipmentTermsId===rid);
  if(['Cancelled','Reversed','Inactive','Blocked','Customs Cancelled'].includes(status)&&dependents.some((r:any)=>!['Cancelled','Reversed','Inactive'].includes(r.status)))throw new Error('Active related records exist. Close or reverse those records first.');
  if(kind==='shipping-bills'&&status==='Assessed'&&!existing.assessedDate)throw new Error('Enter the assessed date before assessment.');
  if(kind==='shipping-bills'&&status==='LEO'&&(!existing.leoDate||!all.some((r:any)=>r.kind==='op-document'&&r.entityId===rid&&r.category==='LEO copy')))throw new Error('Enter the LEO date and upload the LEO copy first.');
  if(kind==='shipping-bills'&&status==='EGM'&&(!existing.egmNumber||!existing.egmDate))throw new Error('Enter the EGM number and date first.');
  if(m.posting&&['Posted','Reversed'].includes(status)){
   let journal:any;const stockStatements:any[]=[];const stockJournal:any[]=[];
   if(status==='Posted'){for(const field of m.fields)if(field.required&&!existing[field.key])throw new Error(`${field.label} is required before posting.`);}
   if(status==='Reversed'){
    const original=find(rid+'-posting','journal');if(!original)throw new Error('Original posting is unavailable.');
    journal={...original,lines:original.lines.map((l:any)=>({...l,debit:l.credit,credit:l.debit})),memo:`Reversal: ${existing.reference}`,date:today().slice(0,10)};
   }else{
    const amount=existing.amount;if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('Document amount must be positive.');
    if(['receipt','payment'].includes(m.posting)){
     const invoice=find(existing.invoiceId);if(!invoice||invoice.status!=='Posted'||invoice.partnerId!==existing.partnerId||invoice.currency!==existing.currency)throw new Error('Select a posted invoice for the same partner and currency.');
     const allocated=all.filter((r:any)=>r.invoiceId===invoice.id&&r.status==='Posted'&&['receipts','payments'].includes(r.kind)).reduce((s:number,r:any)=>s+r.amount,0);
     if(allocated+amount>invoice.amount)throw new Error('Payment exceeds the remaining invoice balance.');
    }
    const sale=m.posting==='sale',purchase=m.posting==='purchase',expense=m.posting==='expense';
    let lines:any[]=[];
    if(sale||purchase||expense){
     if(!existing.lines?.length)throw new Error('Edit this document and add its item lines before posting.');
     const total=(field:string)=>existing.lines.reduce((s:number,l:any)=>s+(l[field]||0),0);
     const base=total('basic')+total('other')+total('rounding'),gst=total('gst'),tcs=total('tcs'),tds=total('tds');
     if(base<=0)throw new Error('Basic value including charges must be positive.');
     lines=sale?[{account:'1100',debit:amount,credit:0},{account:'4000',debit:0,credit:base},{account:'2100',debit:0,credit:gst},{account:'2120',debit:0,credit:tcs},{account:'1320',debit:tds,credit:0}]:[{account:purchase?'1200':'6000',debit:base,credit:0},{account:'1300',debit:gst,credit:0},{account:'1310',debit:tcs,credit:0},{account:'2110',debit:0,credit:tds},{account:'2000',debit:0,credit:amount}];
    }else{
     const pair:Record<string,string[]>={receipt:['1000','1100'],payment:['2000','1000'],'supplier-advance':['1400','1000'],'customer-advance':['1000','2200']};
     const [debit,credit]=pair[m.posting];lines=[{account:debit,debit:amount,credit:0},{account:credit,debit:0,credit:amount}];
    }
    lines=lines.filter(l=>l.debit||l.credit);assertBalanced(lines);
    journal={date:existing.date,reference:existing.reference,currency:existing.currency,status:'Posted',memo:`${m.label}: ${existing.reference}`,sourceId:rid,lines};
   }
   if(['purchase','sale'].includes(m.posting)){
    const stockLines=status==='Reversed'?all.filter((r:any)=>r.kind==='movements'&&r.sourceId===rid&&r.operationStock):existing.lines.filter((l:any)=>l.productId);
    const used=new Set<string>();
    for(const [i,line] of stockLines.entries()){
     const productId=line.productId,warehouseId=existing.warehouseId;
     if(!warehouseId)throw new Error('Select a warehouse before posting stock.');
     const key=productId+'|'+warehouseId;
     if(used.has(key))throw new Error('Combine repeated products into one line before posting.');used.add(key);
     const quantity=status==='Reversed'?Number(line.quantity):Number(line.quantity);
     if(!Number.isSafeInteger(quantity)||quantity<=0)throw new Error('Stock quantities must be positive whole units.');
     const inward=status==='Reversed'?line.direction==='Issue':m.posting==='purchase';
     const bal=await db.prepare('SELECT * FROM stock_balances WHERE tenant_id=? AND product_id=? AND warehouse_id=? AND currency=?').bind(u.tenant_id,productId,warehouseId,existing.currency).first();
     let value=status==='Reversed'?line.stockValue:m.posting==='purchase'?line.basic+line.other+line.rounding:bal&&bal.quantity?Math.round(bal.value*quantity/bal.quantity):0;
     if(!inward&&(!bal||bal.quantity<quantity))throw new Error('Insufficient stock for '+(line.description||productId)+'.');
     if(inward){stockStatements.push(db.prepare('INSERT INTO stock_balances(tenant_id,product_id,warehouse_id,currency,quantity,value) VALUES(?,?,?,?,?,?) ON CONFLICT(tenant_id,product_id,warehouse_id,currency) DO UPDATE SET quantity=quantity+excluded.quantity,value=value+excluded.value,version=version+1').bind(u.tenant_id,productId,warehouseId,existing.currency,quantity,value));}
     else {stockStatements.push(db.prepare('UPDATE stock_balances SET quantity=CASE WHEN version=? THEN quantity-? ELSE -1 END,value=value-?,version=version+1 WHERE tenant_id=? AND product_id=? AND warehouse_id=? AND currency=?').bind(bal.version,quantity,value,u.tenant_id,productId,warehouseId,existing.currency));}
     stockStatements.push(saveNew('movements',{date:journal.date,reference:existing.reference+' '+(status==='Reversed'?'reversal':'stock')+' '+(i+1),sourceId:rid,operationStock:true,productId,warehouseId,quantity,direction:inward?'Receipt':'Issue',stockValue:value,currency:existing.currency,reason, status:'Posted'},`${rid}-stock-${status}-${i}`));
     if(status==='Posted'&&m.posting==='sale'&&value){stockJournal.push({account:'5000',debit:value,credit:0},{account:'1200',debit:0,credit:value});}
     if(status==='Posted'&&m.posting==='purchase'&&line.serialNumbers){const serials=line.serialNumbers.split(/[\n,]+/).map((v:string)=>v.trim()).filter(Boolean);if(serials.length!==quantity||new Set(serials).size!==quantity)throw new Error('Enter one unique serial number for each purchased unit.');for(const serial of serials)stockStatements.push(saveNew('machines',{operation:true,name:line.description,serialNumber:serial,productId,warehouseId,purchaseId:rid,status:'Available',cost:String(value/quantity/100),createdBy:u.name,updatedBy:u.name,updatedAt:today()}));}
    }
    if(status==='Reversed'&&m.posting==='purchase')for(const machine of all.filter((r:any)=>r.kind==='machines'&&r.purchaseId===rid)){if(machine.status!=='Available')throw new Error('Release linked machines before reversing the purchase.');stockStatements.push(db.prepare(`UPDATE records SET data=json_set(data,'$.status','Inactive'),version=version+1 WHERE id=? AND tenant_id=?`).bind(machine.id,u.tenant_id));}
   }
   if(stockJournal.length){journal.lines.push(...stockJournal);assertBalanced(journal.lines);}
   // A deterministic journal key makes concurrent post/reversal requests atomic and idempotent.
   const journalId=`${rid}-${status==='Posted'?'posting':'reversal'}`;
   const guardedJournal=db.prepare(`INSERT INTO records(id,tenant_id,kind,fy,data,created) SELECT ?,?,'journal',?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND tenant_id=? AND version=?)`).bind(journalId,u.tenant_id,fiscalYear(journal.date),JSON.stringify(journal),today(),rid,u.tenant_id,existing.version);
   const statements=[guardedJournal,db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND tenant_id=? AND version=?').bind(JSON.stringify({...existing,status,updatedBy:u.name,updatedAt:today()}),rid,u.tenant_id,existing.version),event(status,kind,rid,{reason,reference:existing.reference})];
   // Serialise settlement allocation against the database, including competing receipts.
   if(status==='Posted'&&['receipt','payment'].includes(m.posting)){
    statements[0]=db.prepare(`INSERT INTO records(id,tenant_id,kind,fy,data,created) SELECT ?,?,'journal',?,?,? WHERE (SELECT COALESCE(SUM(json_extract(data,'$.amount')),0) FROM records WHERE tenant_id=? AND kind=? AND json_extract(data,'$.invoiceId')=? AND json_extract(data,'$.status')='Posted')+? <= (SELECT json_extract(data,'$.amount') FROM records WHERE tenant_id=? AND id=?) AND EXISTS(SELECT 1 FROM records WHERE id=? AND tenant_id=? AND version=?)`).bind(`${rid}-posting`,u.tenant_id,fiscalYear(journal.date),JSON.stringify(journal),today(),u.tenant_id,kind,existing.invoiceId,existing.amount,u.tenant_id,existing.invoiceId,rid,u.tenant_id,existing.version);
    statements[1]=db.prepare(`UPDATE records SET data=?,version=version+1 WHERE id=? AND tenant_id=? AND version=? AND EXISTS(SELECT 1 FROM records WHERE id=? AND tenant_id=?)`).bind(JSON.stringify({...existing,status,updatedBy:u.name,updatedAt:today()}),rid,u.tenant_id,existing.version,`${rid}-posting`,u.tenant_id);
    statements[2]=conditionalAudit(status,{reason,reference:existing.reference});
   }
   if(status==='Posted'&&['receipt','payment'].includes(m.posting)){statements.unshift(db.prepare(`INSERT INTO posting_guards(id,expected,actual) VALUES(?,1,CASE WHEN (SELECT COALESCE(SUM(json_extract(data,'$.amount')),0) FROM records WHERE tenant_id=? AND kind=? AND json_extract(data,'$.invoiceId')=? AND json_extract(data,'$.status')='Posted')+? <= (SELECT json_extract(data,'$.amount') FROM records WHERE tenant_id=? AND id=?) THEN 1 ELSE 0 END)`).bind(journalId+'-allocation',u.tenant_id,kind,existing.invoiceId,existing.amount,u.tenant_id,existing.invoiceId));}
   const guard=db.prepare('INSERT INTO posting_guards(id,expected,actual) VALUES(?,?,(SELECT version FROM records WHERE id=? AND tenant_id=?))').bind(journalId,existing.version,rid,u.tenant_id);
   const result=await db.batch([guard,...statements,...stockStatements]);if(!result[1].meta.changes)return json({error:'Record or invoice balance changed. Reload before posting.'},409);
   return json({id:rid});
  }
  return update({...existing,status},'Status changed',{from:current,to:status,reason});
 }
 if(action==='convert'){
  const target=opMap[b.target];if(!m.convert?.includes(b.target)||!target||!permittedOperation(target,u.role,true))throw new Error('Conversion is not allowed.');
  if(['Draft','Cancelled','Reversed','Rejected'].includes(existing.status))throw new Error('Confirm or accept this record before conversion.');
  const newId=makeId(),data={...existing,id:undefined,kind:undefined,version:undefined,created:undefined,reference:clean(b.reference,200),sourceId:rid,status:initialStatus(target),operation:true,createdBy:u.name,updatedAt:today()};
  if(!data.reference)throw new Error('Enter the new document reference.');
  await db.batch([saveNew(target.key,data,newId),event('Converted',kind,rid,{target:target.key,id:newId,reason}),event('Created',target.key,newId,{sourceId:rid})]);return json({id:newId,kind:target.key},201);
 }
 if(action&&action!=='save')throw new Error('Unknown action.');
 if(existing&&m.posting&&existing.status!=='Draft')throw new Error('Posted documents cannot be edited. Reverse and create a corrected document.');
 if(existing&&['Cancelled','Reversed','Completed','Closed'].includes(existing.status))throw new Error('Closed records cannot be edited.');
 const data:any={operation:true,status:existing?.status||initialStatus(m),createdBy:existing?.createdBy||u.name,updatedBy:u.name,updatedAt:today()};
 for(const field of m.fields){
  let v=clean(b[field.key],field.type==='textarea'?12000:500);
  if(field.required&&!v)throw new Error(`${field.label} is required.`);
  if(v&&field.type==='date')validDate(v);
  if(v&&field.type==='number'&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1e11))throw new Error(`${field.label} must be a non-negative number.`);
  if(v&&field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new Error('Enter a valid email address.');
  if(v&&field.options&&!field.options.includes(v))throw new Error(`Invalid ${field.label}.`);
  if(v&&field.source){const linked=find(v);if(!linked||!(references[field.source]||[field.source]).includes(linked.kind)||['Inactive','Blocked','Cancelled','Reversed'].includes(linked.status))throw new Error(`Select an active ${field.label}.`);}
  data[field.key]=v;
 }
 if(data.dueDate&&data.dueDate<data.date)throw new Error('Due date cannot precede the document date.');
 if(kind==='master-currency'&&!/^[A-Z]{3}$/.test(data.code))throw new Error('Currency code must be three uppercase letters.');
 if(existing&&kind==='master-currency'&&data.code!==existing.code)throw new Error('Currency codes cannot be changed after creation.');
 data.currency=data.currencyId?find(data.currencyId)?.code:existing?.currency;
 if(m.lines){data.lines=calculateLines(b.lines);for(const l of data.lines)if(l.productId&&find(l.productId)?.kind!=='products')throw new Error('Select a valid product for each line.');data.amount=data.lines.reduce((n:number,l:any)=>n+l.total,0);}
 else if(!m.master&&data.amount)data.amount=moneyMinor(data.amount);
 if(kind==='shipping-bills'&&data.assessedDate&&!data.leoDueDate){const date=new Date(data.assessedDate+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+15);data.leoDueDate=date.toISOString().slice(0,10);}
 if(existing)return update(data,'Edited',{reason,before:redact(existing),after:redact(data)});
 const newId=makeId();await db.batch([saveNew(kind,data,newId),event('Created',kind,newId,{reference:data.reference||data.name})]);return json({id:newId},201);
}
