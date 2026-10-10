import { productionPlan } from '@/lib/production-recipe';

export function ProductionRecipePreview({ bomId, outputProductId, quantity, expectedScrapQuantity, records }: {
  bomId: string;
  outputProductId: string;
  quantity: string;
  expectedScrapQuantity: string;
  records: any[];
}) {
  const bom = records.find(r => r.id === bomId && r.kind === 'master-bom');
  if (!bomId || !quantity) return <p className="op-note">Select a structured BOM and planned good units to preview materials before production starts.</p>;
  if (!bom) return <p className="op-note" role="alert">Selected BOM is unavailable.</p>;
  if (bom.productId !== outputProductId) return <p className="op-note" role="alert">The production output product must match the BOM finished product.</p>;
  let plan;
  try { plan = productionPlan(bom, quantity, expectedScrapQuantity, records); }
  catch (error: any) { return <p className="op-note" role="alert">{error.message}</p>; }
  return <section className="op-child-rows" aria-label="Production materials plan">
    <strong>Production materials preview</strong>
    <p>{plan.finishedProduct}: {plan.plannedGoodQuantity} planned good units · {plan.expectedScrapQuantity} expected scrap units · {plan.expectedYieldPercent}% expected yield.</p>
    <ul>{plan.materials.map(row => <li key={row.productId}>{row.product}: {row.requiredQuantity} {row.unit} ({row.quantityPerUnit} per good unit)</li>)}</ul>
    <p className="op-note">This is a planning quantity for good output. Scrap is a forecast only; this preview does not reserve, consume or value stock. Record actual material consumption separately.</p>
  </section>;
}
