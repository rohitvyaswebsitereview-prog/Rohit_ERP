export function productSalesMatches(r: any, fy: string, currency: string, month: string, product: string) {
  return r.kind === 'invoices' && r.fy === fy && r.currency === currency &&
    ['Posted', 'Imported'].includes(r.status) &&
    (!month || r.date?.slice(5, 7) === month) &&
    (!product || (r.lines || []).some((line: any) => line.productId === product));
}
export function productSalesTotal(records: any[], fy: string, currency: string, month: string, product: string) {
  return records.filter(r => productSalesMatches(r, fy, currency, month, product))
    .reduce((sum, r) => sum + (r.lines || []).filter((line: any) => !product || line.productId === product)
      .reduce((total: number, line: any) => total + (Number.isFinite(Number(line.total)) ? Number(line.total) : 0), 0), 0);
}
