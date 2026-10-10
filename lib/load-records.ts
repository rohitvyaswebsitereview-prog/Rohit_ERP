/** Bounded transport for legacy screens that still require connected records. */
export async function loadRecords(api:(path:string)=>Promise<any>,onPage?:(records:any[],meta:any)=>void) {
  const records:any[]=[];const ids=new Set<string>();let offset=0;
  while (true) {
    const page=await api('record-page?limit=200&offset='+offset);
    if (!Array.isArray(page.records)||page.offset!==offset||!Number.isSafeInteger(page.total)||page.total<0||page.records.length>200) throw new Error('Invalid record page. Refresh to retry.');
    if (page.hasMore && !page.records.length) throw new Error('Empty record page cannot make progress.');
    for (const record of page.records) {if(ids.has(record.id)) throw new Error('Records changed while loading. Refresh to retry.');ids.add(record.id);records.push(record);}
    onPage?.(page.records,page);offset+=page.records.length;
    if (!page.hasMore) {if(records.length!==page.total) throw new Error('Incomplete record total. Refresh to retry.');return records;}
    if (offset>=page.total) throw new Error('Invalid page progress. Refresh to retry.');
  }
}
