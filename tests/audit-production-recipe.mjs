import assert from 'node:assert/strict';
import { test } from 'node:test';

const recipe = await import('../lib/production-recipe.ts').catch(() => ({}));
const records = [
  { id: 'finished', kind: 'products', name: 'Finished unit', unitId: 'pcs', status: 'Active' },
  { id: 'steel', kind: 'products', name: 'Steel part', unitId: 'pcs', status: 'Active' },
  { id: 'seal', kind: 'products', name: 'Seal', unitId: 'pcs', status: 'Active' },
  { id: 'inactive', kind: 'products', name: 'Old part', unitId: 'pcs', status: 'Inactive' },
  { id: 'pcs', kind: 'master-units', name: 'Pieces', code: 'PCS', status: 'Active' },
  { id: 'kg', kind: 'master-units', name: 'Kilograms', code: 'KG', status: 'Active' },
];

test('a structured BOM produces an explicit materials plan with named products', () => {
  const bom = { productId: 'finished', components: [
    { productId: 'steel', unitId: 'pcs', quantityPerUnit: '2' },
    { productId: 'seal', unitId: 'pcs', quantityPerUnit: '1' },
  ] };
  assert.deepEqual(recipe.productionPlan?.(bom, '3', '1', records), {
    finishedProduct: 'Finished unit', plannedGoodQuantity: 3,
    expectedScrapQuantity: 1, expectedYieldPercent: 75,
    materials: [
      { productId: 'steel', product: 'Steel part', unit: 'PCS', quantityPerUnit: 2, requiredQuantity: 6 },
      { productId: 'seal', product: 'Seal', unit: 'PCS', quantityPerUnit: 1, requiredQuantity: 3 },
    ],
  });
});

test('legacy free text requires explicit migration, not silent parsing', () => {
  assert.throws(() => recipe.productionPlan?.({ productId: 'finished', components: '2 steel parts per unit' }, '3', '0', records), /legacy BOM.*structured/i);
});

test('inactive, duplicate, self-referential and mismatched-unit ingredients are rejected', () => {
  const invalid = [
    [{ productId: 'inactive', unitId: 'pcs', quantityPerUnit: '1' }],
    [{ productId: 'steel', unitId: 'pcs', quantityPerUnit: '1' }, { productId: 'steel', unitId: 'pcs', quantityPerUnit: '2' }],
    [{ productId: 'finished', unitId: 'pcs', quantityPerUnit: '1' }],
    [{ productId: 'steel', unitId: 'kg', quantityPerUnit: '1' }],
  ];
  for (const components of invalid)
    assert.throws(() => recipe.validateRecipe?.('finished', components, records));
});

test('zero or fractional quantities cannot create an unpostable stock plan', () => {
  const bom = { productId: 'finished', components: [{ productId: 'steel', unitId: 'pcs', quantityPerUnit: '2' }] };
  for (const quantity of ['0', '-1', '1.5', 'many'])
    assert.throws(() => recipe.productionPlan?.(bom, quantity, '0', records));
  for (const perUnit of ['0', '0.5', '-2'])
    assert.throws(() => recipe.validateRecipe?.('finished', [{ productId: 'steel', unitId: 'pcs', quantityPerUnit: perUnit }], records));
});
