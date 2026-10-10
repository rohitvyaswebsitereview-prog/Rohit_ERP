/** Pure quantity matching for purchase invoices linked to a purchase order. */
export type PurchaseLine = { productId?: string; quantity?: string | number };
export type PurchaseRecord = {
  id: string;
  kind: string;
  status: string;
  sourceId?: string;
  partnerId?: string;
  currencyId?: string;
  lines?: PurchaseLine[];
};
export type PurchaseProgress = {
  productId: string;
  ordered: number;
  received: number;
  remaining: number;
};
export type PurchaseMatch = PurchaseProgress & { candidate: number };

// Quantities are stored as thousandths, avoiding floating point comparisons.
function units(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000)
    throw new Error('Purchase quantity must be positive and at most 1,000,000.');
  const scaled = quantity * 1000;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-7)
    throw new Error('Purchase quantity must have at most three decimal places.');
  return Math.round(scaled);
}

function lineUnits(lines: PurchaseLine[] | undefined): Map<string, number> {
  if (!Array.isArray(lines) || !lines.length)
    throw new Error('Purchase document needs product lines.');
  const result = new Map<string, number>();
  for (const line of lines) {
    const productId = String(line?.productId || '').trim();
    if (!productId) throw new Error('Every purchase line needs a product.');
    if (result.has(productId))
      throw new Error('Combine repeated product lines before purchase matching.');
    result.set(productId, units(line.quantity));
  }
  return result;
}

function balance(order: PurchaseRecord, allRecords: PurchaseRecord[], excludeId?: string) {
  if (order.kind !== 'purchase-orders') throw new Error('Purchase order is unavailable.');
  const ordered = lineUnits(order.lines);
  const received = new Map<string, number>([...ordered.keys()].map((id) => [id, 0]));
  for (const record of allRecords) {
    if (record.kind !== 'purchase-invoices' || record.sourceId !== order.id ||
        record.status !== 'Posted' || record.id === excludeId) continue;
    for (const [id, quantity] of lineUnits(record.lines)) {
      if (!ordered.has(id)) throw new Error('Posted invoice has a product outside the purchase order.');
      received.set(id, received.get(id)! + quantity);
    }
  }
  return { ordered, received };
}

/** Quantity progress from posted invoices. Caller must provide tenant-scoped records. */
export function purchaseOrderProgress(
  order: PurchaseRecord, allRecords: PurchaseRecord[], excludeInvoiceId?: string,
): PurchaseProgress[] {
  const { ordered, received } = balance(order, allRecords, excludeInvoiceId);
  return [...ordered].map(([productId, orderedUnits]) => {
    const receivedUnits = received.get(productId)!;
    return { productId, ordered: orderedUnits / 1000, received: receivedUnits / 1000,
      remaining: (orderedUnits - receivedUnits) / 1000 };
  });
}

/** Validates a candidate at posting time; returns remaining quantity after it. */
export function validatePurchaseMatch(
  invoice: PurchaseRecord, allRecords: PurchaseRecord[],
): PurchaseMatch[] | null {
  if (!invoice.sourceId) return null;
  if (invoice.kind !== 'purchase-invoices') throw new Error('Expected a purchase invoice.');
  const matches = allRecords.filter((record) =>
    record.kind === 'purchase-orders' && record.id === invoice.sourceId);
  if (matches.length !== 1) throw new Error('Linked purchase order is unavailable or ambiguous.');
  const order = matches[0];
  if (order.status !== 'Accepted') throw new Error('Linked purchase order must be Accepted.');
  if (!invoice.partnerId || invoice.partnerId !== order.partnerId)
    throw new Error('Purchase invoice supplier differs from the purchase order.');
  if (!invoice.currencyId || invoice.currencyId !== order.currencyId)
    throw new Error('Purchase invoice currency differs from the purchase order.');
  const candidate = lineUnits(invoice.lines);
  const { ordered, received } = balance(order, allRecords, invoice.id);
  for (const [id, orderedUnits] of ordered)
    if (received.get(id)! > orderedUnits)
      throw new Error('Posted purchase invoice quantity already exceeds ordered quantity.');
  for (const [id, quantity] of candidate) {
    if (!ordered.has(id)) throw new Error('Purchase invoice product is absent from purchase order.');
    if (received.get(id)! + quantity > ordered.get(id)!)
      throw new Error('Purchase invoice quantity exceeds ordered quantity.');
  }
  return [...ordered].map(([productId, orderedUnits]) => {
    const receivedUnits = received.get(productId)!;
    const candidateUnits = candidate.get(productId) || 0;
    return { productId, ordered: orderedUnits / 1000, received: receivedUnits / 1000,
      candidate: candidateUnits / 1000,
      remaining: (orderedUnits - receivedUnits - candidateUnits) / 1000 };
  });
}
