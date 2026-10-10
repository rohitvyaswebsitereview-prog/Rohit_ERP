import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePurchaseMatch, purchaseOrderProgress } from '../lib/purchase-matching.ts';

const order = {
  id: 'po-1', kind: 'purchase-orders', status: 'Accepted',
  partnerId: 'vendor-1', currencyId: 'INR', fy: '2025-26',
  lines: [{ productId: 'a', quantity: '10' }, { productId: 'b', quantity: '2.5' }],
};
const invoice = (id, lines, extra = {}) => ({
  id, kind: 'purchase-invoices', status: 'Draft', sourceId: 'po-1',
  partnerId: 'vendor-1', currencyId: 'INR', fy: '2026-27', lines, ...extra,
});

test('partial invoice leaves a measurable balance across financial years', () => {
  const previous = invoice('older', [{ productId: 'a', quantity: '4' }], { status: 'Posted', fy: '2025-26' });
  const result = validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '3.25' }]), [order, previous]);
  assert.deepEqual(result, [
    { productId: 'a', ordered: 10, received: 4, candidate: 3.25, remaining: 2.75 },
    { productId: 'b', ordered: 2.5, received: 0, candidate: 0, remaining: 2.5 },
  ]);
});

test('posted invoices cannot cumulatively exceed ordered quantity', () => {
  const previous = invoice('older', [{ productId: 'a', quantity: '8' }], { status: 'Posted' });
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '2.001' }]), [order, previous]), /exceeds ordered quantity/i);
});

test('reversed invoices and the current candidate do not consume order balance', () => {
  const reversed = invoice('reversed', [{ productId: 'a', quantity: '10' }], { status: 'Reversed' });
  const same = invoice('new', [{ productId: 'a', quantity: '10' }], { status: 'Posted' });
  const result = validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '10' }]), [order, reversed, same]);
  assert.equal(result[0].remaining, 0);
});

test('linked order must be accepted with same vendor and currency', () => {
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '1' }]), [{ ...order, status: 'Issued' }]), /accepted/i);
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '1' }], { partnerId: 'other' }), [order]), /supplier/i);
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '1' }], { currencyId: 'USD' }), [order]), /currency/i);
});

test('wrong products, duplicate products, and nonpositive quantities fail', () => {
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'c', quantity: '1' }]), [order]), /purchase order/i);
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '1' }, { productId: 'a', quantity: '1' }]), [order]), /repeated product/i);
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '0' }]), [order]), /positive/i);
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '1.0001' }]), [order]), /three decimal/i);
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: '', quantity: '1' }]), [order]), /product/i);
});

test('duplicate ordered products are ambiguous and rejected', () => {
  const duplicate = { ...order, lines: [...order.lines, { productId: 'a', quantity: '1' }] };
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '1' }]), [duplicate]), /repeated product/i);
});

test('duplicate order IDs from an unscoped record set fail closed', () => {
  const foreignTenantOrder = { ...order, partnerId: 'vendor-foreign' };
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '1' }]),
    [order, foreignTenantOrder]), /ambiguous/i);
});

test('existing over-receipt blocks further posting against the same order', () => {
  const badHistory = invoice('older', [{ productId: 'a', quantity: '11' }], { status: 'Posted' });
  assert.throws(() => validatePurchaseMatch(invoice('new', [{ productId: 'b', quantity: '1' }]),
    [order, badHistory]), /exceeds ordered quantity/i);
});

test('progress counts only posted invoices on the requested order', () => {
  const posted = invoice('posted', [{ productId: 'a', quantity: '4' }], { status: 'Posted' });
  const draft = invoice('draft', [{ productId: 'a', quantity: '5' }]);
  const otherOrder = invoice('other', [{ productId: 'a', quantity: '5' }], { status: 'Posted', sourceId: 'po-2' });
  assert.deepEqual(purchaseOrderProgress(order, [posted, draft, otherOrder])[0],
    { productId: 'a', ordered: 10, received: 4, remaining: 6 });
});

test('unlinked purchase invoices have no PO match to validate', () => {
  assert.equal(validatePurchaseMatch(invoice('new', [{ productId: 'a', quantity: '1' }], { sourceId: '' }), [order]), null);
});
