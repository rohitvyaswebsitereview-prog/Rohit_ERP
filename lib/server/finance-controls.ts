import { fiscalYear } from '../domain';

const json = (data: any, status = 200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function financeControls(req: Request, body: any, user: any, db: any) {
  if (!['Admin','Finance','Viewer'].includes(user.role)) return json({error:'Finance access required.'},403);
  if (req.method === 'GET') {
    const rows = (await db.prepare('SELECT * FROM accounting_periods WHERE tenant_id=? ORDER BY start_date DESC').bind(user.tenant_id).all()).results;
    const discovered = (await db.prepare("SELECT DISTINCT fy FROM records WHERE tenant_id=? AND fy<>'master'").bind(user.tenant_id).all()).results;
    const years = new Map(rows.map((r:any)=>[r.fy,r]));
    const current = fiscalYear(new Date().toISOString().slice(0,10));
    for (const fy of [current,...discovered.map((r:any)=>r.fy)]) if (/^\d{4}–\d{2}$/.test(fy) && !years.has(fy)) {
      const year=Number(fy.slice(0,4));
      years.set(fy,{fy,start_date:`${year}-04-01`,end_date:`${year+1}-03-31`,state:'Open',version:0});
    }
    const controls=await db.prepare('SELECT data FROM accounting_controls WHERE tenant_id=?').bind(user.tenant_id).first();
    return json({years:[...years.values()].sort((a:any,b:any)=>b.start_date.localeCompare(a.start_date)),controls:controls?JSON.parse(controls.data):{separateApprover:false},
      basis:'Balances carry forward from dated postings. Opening migration entries require accountant approval.'});
  }
  if (req.method !== 'POST') return json({error:'Method not allowed.'},405);
  if (user.role !== 'Admin') return json({error:'Administrator access required.'},403);
  const reason=String(body.reason || '').trim();
  if (reason.length < 5 || reason.length > 1000) throw new Error('Enter a reason of 5–1000 characters.');
  const audit=(action:string,fy:string,detail:any)=>db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.tenant_id,user.id,action,fy,'accounting-periods',JSON.stringify({reason,...detail}),new Date().toISOString());
  if (body.action === 'approval-policy') {
    if (typeof body.separateApprover !== 'boolean') throw new Error('Choose whether a different approver is required.');
    await db.batch([db.prepare('INSERT INTO accounting_controls VALUES(?,?) ON CONFLICT(tenant_id) DO UPDATE SET data=excluded.data').bind(user.tenant_id,JSON.stringify({separateApprover:body.separateApprover})),audit('Approval policy changed','',{separateApprover:body.separateApprover})]);
    return json({ok:true});
  }
  let year:number;
  if (body.action === 'create-year') {
    year=Number(body.startYear);
    if (!Number.isInteger(year) || year<2000 || year>2100) throw new Error('Enter a financial-year starting year between 2000 and 2100.');
  } else {
    if (!/^\d{4}–\d{2}$/.test(String(body.fy))) throw new Error('Choose a valid financial year.');
    year=Number(body.fy.slice(0,4));
    if (body.fy !== fiscalYear(`${year}-04-01`)) throw new Error('Financial year is invalid.');
    if (!['close','reopen'].includes(body.action)) throw new Error('Unknown financial-year action.');
  }
  const fy=fiscalYear(`${year}-04-01`), state=body.action==='close'?'Closed':'Open';
  const previous=await db.prepare('SELECT * FROM accounting_periods WHERE tenant_id=? AND fy=?').bind(user.tenant_id,fy).first();
  if (body.action==='create-year' && previous) throw new Error('This year already exists.');
  await db.batch([db.prepare('INSERT INTO accounting_periods(tenant_id,fy,start_date,end_date,state) VALUES(?,?,?,?,?) ON CONFLICT(tenant_id,fy) DO UPDATE SET state=excluded.state,version=version+1').bind(user.tenant_id,fy,`${year}-04-01`,`${year+1}-03-31`,state),audit(body.action==='create-year'?'Financial year created':state==='Closed'?'Accounting period closed':'Accounting period reopened',fy,{from:previous?.state||'Open',to:state})]);
  return json({ok:true,fy,state});
}
