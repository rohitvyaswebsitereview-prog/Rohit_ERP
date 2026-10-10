type Balance = {currency:string;quantity:number;value:number;version:number;[key:string]:any};
/** Currency describes a cost pool, never whether physical goods may be sold. */
export function planStockIssue(balances: Balance[], quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Stock quantities must be positive whole units.');
  const pools = balances.filter(b=>b.quantity > 0).sort((a,b)=>a.currency.localeCompare(b.currency));
  if (pools.reduce((sum,b)=>sum+b.quantity,0) < quantity) throw new Error('Insufficient stock in this warehouse.');
  const plan: (Balance & {stockValue:number})[]=[];
  let remaining=quantity;
  for (const pool of pools) {
    if (!remaining) break;
    const take=Math.min(pool.quantity,remaining);
    plan.push({...pool,quantity:take,stockValue:take===pool.quantity ? pool.value : Math.round(pool.value*take/pool.quantity)});
    remaining-=take;
  }
  return plan;
}
