import {redactAccess} from '../access-policy';
export async function recordPage(req:Request,user:any,db:any,allowedKinds:string[]) {
  const p=new URL(req.url).searchParams, offset=Number(p.get('offset') || 0),limit=Number(p.get('limit') || 200),fy=p.get('fy'),kind=p.get('kind'),q=(p.get('q') || '').trim().slice(0,150);
  const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  if (!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>200) return json({error:'Invalid page bounds.'},400);
  if (fy && !/^\d{4}–\d{2}$/.test(fy)) return json({error:'Invalid financial year.'},400);
  if (kind && !allowedKinds.includes(kind)) return json({error:'Kind unavailable.'},400);
  const where="tenant_id=? AND kind IN (SELECT value FROM json_each(?)) AND (?='' OR fy=? OR fy='master') AND (?='' OR lower(COALESCE(json_extract(data,'$.name'),'') || ' ' || COALESCE(json_extract(data,'$.reference'),'') || ' ' || COALESCE(json_extract(data,'$.sku'),'')) LIKE ? ESCAPE '\\')";
  const pattern='%'+q.toLowerCase().replace(/[\\%_]/g,'\\$&')+'%';
  const args=[user.tenant_id,JSON.stringify(kind?[kind]:[...new Set(allowedKinds)]),fy||'',fy||'',q,pattern];
  const count=await db.prepare('SELECT COUNT(*) total FROM records WHERE '+where).bind(...args).first();
  const rows=(await db.prepare('SELECT * FROM records WHERE '+where+' ORDER BY created DESC,id DESC LIMIT ? OFFSET ?').bind(...args,limit,offset).all()).results;
  return json({records:rows.map((r:any)=>redactAccess({...JSON.parse(r.data),id:r.id,kind:r.kind,fy:r.fy,version:r.version,created:r.created},user.role)),total:count.total,offset,limit,hasMore:offset+rows.length<count.total});
}
