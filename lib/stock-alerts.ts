import { inactive } from './relationships';
/** Product reorder points apply to total recorded quantity across all warehouses. */
export function stockAlerts(records: any[], balances: any[]) {
  const totals = new Map<string, number>();
  for (const row of balances) {
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) continue;
    totals.set(row.product_id, (totals.get(row.product_id) || 0) + quantity);
  }
  return records.filter(p => p.kind === 'products' && !inactive(p) && p.status !== 'Inactive' && totals.has(p.id)).flatMap(p => {
    const quantity = totals.get(p.id)!;
    const threshold = Number(p.reorderPoint);
    if (quantity > 0 && !(Number.isFinite(threshold) && threshold > 0 && quantity <= threshold)) return [];
    const unit = records.find(r => r.id === p.unitId)?.code || p.unit || 'units';
    return [{ id: 'stock-' + p.id, severity: quantity === 0 ? 'Warning' : 'Attention',
      title: (p.name || p.sku || 'Product') + (quantity === 0 ? ' is out of stock' : ' is below reorder level'),
      detail: `${quantity} ${unit} across recorded warehouses${threshold > 0 ? ' · Reorder level ' + threshold : ''}`,
      route: 'inventory-stock-register?product=' + encodeURIComponent(p.id), group: 'Stock' }];
  });
}
