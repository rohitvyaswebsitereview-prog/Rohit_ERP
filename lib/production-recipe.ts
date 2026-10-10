type CatalogRecord = {
  id: string;
  kind: string;
  name?: string;
  code?: string;
  unitId?: string;
  status?: string;
};

export type RecipeComponent = {
  productId: string;
  unitId: string;
  quantityPerUnit: string;
};

const active = (record: CatalogRecord | undefined) =>
  !!record && !['Inactive', 'Archived', 'Disabled', 'Blocked', 'Cancelled'].includes(record.status || '');

function wholeUnits(value: unknown, name: string, allowZero = false) {
  const raw = String(value ?? '').trim();
  if (!/^(0|[1-9]\d*)$/.test(raw)) throw new Error(`${name} must be a whole number.`);
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || (allowZero ? amount < 0 : amount <= 0))
    throw new Error(`${name} must be ${allowZero ? 'non-negative' : 'positive'}.`);
  return amount;
}

export function validateRecipe(
  finishedProductId: string,
  components: unknown,
  records: CatalogRecord[],
) {
  const finished = records.find(r => r.id === finishedProductId && r.kind === 'products');
  if (!active(finished)) throw new Error('Select an active finished product.');
  if (typeof components === 'string')
    throw new Error('This legacy BOM needs explicit migration to structured component rows.');
  if (!Array.isArray(components) || !components.length || components.length > 50)
    throw new Error('Add 1–50 structured component rows.');
  const seen = new Set<string>();
  return components.map((component: RecipeComponent, index: number) => {
    const product = records.find(r => r.id === component?.productId && r.kind === 'products');
    const unit = records.find(r => r.id === component?.unitId && r.kind === 'master-units');
    if (!active(product)) throw new Error(`Component ${index + 1}: select an active product.`);
    if (product!.id === finishedProductId) throw new Error('The finished product cannot be its own component.');
    if (seen.has(product!.id)) throw new Error('Combine duplicate component products into one row.');
    seen.add(product!.id);
    if (!active(unit)) throw new Error(`Component ${index + 1}: select an active unit.`);
    if (product!.unitId && product!.unitId !== unit!.id)
      throw new Error(`Component ${index + 1}: unit must match the product unit; no conversion is configured.`);
    const quantityPerUnit = wholeUnits(component.quantityPerUnit, `Component ${index + 1} quantity`);
    return {
      productId: product!.id,
      product: product!.name || product!.id,
      unitId: unit!.id,
      unit: unit!.code || unit!.name || unit!.id,
      quantityPerUnit,
    };
  });
}

export function productionPlan(
  bom: { productId: string; components: unknown },
  plannedGoodQuantity: unknown,
  expectedScrapQuantity: unknown,
  records: CatalogRecord[],
) {
  const good = wholeUnits(plannedGoodQuantity, 'Planned good quantity');
  const scrap = wholeUnits(expectedScrapQuantity || '0', 'Expected scrap quantity', true);
  const components = validateRecipe(bom.productId, bom.components, records);
  const finished = records.find(r => r.id === bom.productId)!;
  return {
    finishedProduct: finished.name || finished.id,
    plannedGoodQuantity: good,
    expectedScrapQuantity: scrap,
    expectedYieldPercent: Math.round(good / (good + scrap) * 10000) / 100,
    materials: components.map(row => {
      const requiredQuantity = row.quantityPerUnit * good;
      if (!Number.isSafeInteger(requiredQuantity)) throw new Error('Required material quantity is too large.');
      return {
        productId: row.productId,
        product: row.product,
        unit: row.unit,
        quantityPerUnit: row.quantityPerUnit,
        requiredQuantity,
      };
    }),
  };
}
