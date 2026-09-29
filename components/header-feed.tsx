'use client';
import { useEffect, useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import { api } from './erp-ui';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { canOpenWorkspace } from '@/lib/workspace-navigation';
export function HeaderFeed({ type, fy, revision, go, role }: {type:'activity'|'notifications';fy:string;revision:number;go:(route:string)=>void;role:string}) {
 const [open,setOpen]=useState(false), [items,setItems]=useState<any[]>([]), [error,setError]=useState(''), [loading,setLoading]=useState(false), [retry,setRetry]=useState(0);
 const title=type==='activity'?'Recent Activity':'Notifications';
 useEffect(()=>{if(!open)return;let active=true;setLoading(true);setError('');api(type+'?fy='+encodeURIComponent(fy)).then(data=>{if(active)setItems(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[open,type,fy,revision,retry]);
 async function markRead(){try{await api('notifications/read',{});setItems(items.map(i=>({...i,read:true})));}catch(e:any){setError(e.message);}}
 return <DropdownMenu open={open} onOpenChange={setOpen}><DropdownMenuTrigger render={<button className="shipzy-header-feed-trigger" aria-label={title} title={title}/>}>{type==='activity'?<Clock size={23}/>:<Bell size={23}/>}</DropdownMenuTrigger><DropdownMenuContent className="shipzy-header-feed"><h2>{title}</h2>{loading?<p>Loading…</p>:error?<div role="alert">{error}<button onClick={()=>setRetry(n=>n+1)}>Retry</button></div>:items.length?items.slice(0,6).map(item=><DropdownMenuItem key={item.id} disabled={type==='activity'&&!canOpenWorkspace(item.kind,role)} onClick={()=>go(type==='activity'?item.kind+'?record='+encodeURIComponent(item.record_id):'exceptions?record='+encodeURIComponent(item.id))}><span><strong>{type==='activity'?item.action+' · '+item.kind:item.name}</strong><small>{type==='activity'?item.user_name+' · '+new Date(item.created).toLocaleString('en-IN'):(item.severity||'')+(item.read?' · Read':' · Unread')}</small></span></DropdownMenuItem>):<p>{type==='activity'?'No activity recorded.':'No recorded notifications.'}</p>}{type==='notifications'&&items.some(i=>!i.read)&&<button onClick={markRead}>Mark all as read</button>}<DropdownMenuItem onClick={()=>go(type)}>View all {type}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
