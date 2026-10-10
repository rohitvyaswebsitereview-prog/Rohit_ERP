import assert from 'node:assert/strict';
import * as domain from '../lib/domain.ts';
const movement=(id,direction,quantity,extra={})=>({id,kind:'movements',productId:'p',warehouseId:'w',status:'Posted',direction,quantity,date:'2026-04-01',...extra});
const rows=[movement('receipt','Receipt',10),movement('issue','Issue',3),movement('reversal','Receipt',3),movement('draft','Receipt',100,{status:'Draft'}),movement('cancelled','Receipt',100,{status:'Cancelled'}),movement('future','Receipt',100,{date:'2026-11-01'}),movement('invalid','Issue',NaN),movement('other','Receipt',100,{warehouseId:'elsewhere'})];
assert.equal(domain.physicalStockQuantity?.(rows,'p','w','2026-10-10'),10,'Physical overview must exclude drafts, cancellations, future and invalid movements while netting reversal movements');
assert.equal(domain.physicalStockQuantity?.([],'p','w','2026-10-10'),null,'Missing movement history is unknown rather than zero');
console.log('PASS stock overview uses eligible dated physical movements');
