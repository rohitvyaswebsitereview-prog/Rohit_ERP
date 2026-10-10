import assert from 'node:assert/strict';
import { test } from 'node:test';

const presentation = await import('../lib/audit-presentation.ts').catch(() => ({}));

test('search uses the chosen financial year unless all years is selected', () => {
  assert.equal(presentation.searchPath?.('lathe', '2025–26', false),
    'relationships/search?q=lathe&view=All%20data&fy=2025%E2%80%9326');
  assert.equal(presentation.searchPath?.('lathe', '2025–26', true),
    'relationships/search?q=lathe&view=All%20data');
});

test('tax working register excludes unposted and reversed documents', () => {
  const rows = [
    { id: 'posted', status: 'Posted' },
    { id: 'draft', status: 'Draft' },
    { id: 'reversed', status: 'Reversed' },
    { id: 'imported', status: 'Imported' },
  ];
  assert.deepEqual(presentation.taxWorkingRows?.(rows).map(r => r.id), ['posted']);
});

test('missing sales costs withhold a claimed gross margin', () => {
  assert.deepEqual(presentation.grossProfitPresentation?.(
    { profit: 10000, margin: 100, costCoverage: { complete: false, missingInvoiceIds: ['i1'], invoiceCount: 1, costedInvoiceCount: 0 } }),
    { label: 'Provisional gross profit', margin: null, note: 'Cost missing for 1 posted invoice' });
});

test('manual sales revenue without matched invoices is also provisional', () => {
  assert.deepEqual(presentation.grossProfitPresentation?.({ margin: null, costCoverage: { complete: false, missingInvoiceIds: [], invoiceCount: 0, costedInvoiceCount: 0 } }), {
    label: 'Provisional gross profit', margin: null, note: 'Cost coverage unavailable for posted sales',
  });
});

test('valued stock totals preserve each currency and report missing values', () => {
  const rows = [
    { currency: 'INR', quantity: 2, value: 2500 },
    { currency: 'USD', quantity: 1, value: 1000 },
    { currency: 'INR', quantity: 3, value: 3000 },
    { currency: 'INR', quantity: 1, value: undefined },
  ];
  assert.deepEqual(presentation.stockValueSummary?.(rows), [
    { currency: 'INR', quantity: 5, value: 5500, missingValues: 1 },
    { currency: 'USD', quantity: 1, value: 1000, missingValues: 0 },
  ]);
});

test('company export includes useful setup fields and does not invent missing identifiers', () => {
  assert.deepEqual(presentation.companyExportRow?.({ name: 'Example Exports', tradeName: 'Example', email: 'office@example.test', status: 'Active' }), {
    legalName: 'Example Exports', tradingName: 'Example', gstin: '', email: 'office@example.test', status: 'Active',
  });
});
