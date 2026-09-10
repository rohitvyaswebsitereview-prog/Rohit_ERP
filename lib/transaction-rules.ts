export const calculationRules = [
  {
    id: 'fx',
    version: 1,
    label: 'Receipt FX reconciliation',
    inputs: ['foreignAmount', 'invoiceRate', 'bankRate', 'bankChargesInr'],
    description:
      'Cash INR = foreign amount × bank rate − bank charges. FX = foreign amount × (bank rate − invoice rate). Bank charges remain separate.',
  },
  {
    id: 'tax',
    version: 1,
    label: 'Tax working calculation',
    inputs: ['taxableInr', 'gstRate', 'tcsRate', 'tdsRate', 'interstate'],
    description:
      'GST on taxable value; TCS on taxable plus GST; TDS on taxable value. Rates and applicability require transaction review.',
  },
  {
    id: 'incentive',
    version: 1,
    label: 'Incentive entitlement',
    inputs: ['eligibleFobInr', 'rate', 'capInr'],
    description:
      'Eligible FOB INR × scheme rate, capped only when a positive explicit cap is supplied. No statutory rates are assumed.',
  },
  {
    id: 'contribution',
    version: 1,
    label: 'Transaction contribution',
    inputs: [
      'salesInr',
      'purchaseInr',
      'logisticsInr',
      'bankChargesInr',
      'fxGainInr',
      'earnedIncentivesInr',
    ],
    description:
      'Sales − procurement − logistics − bank charges + FX gain + earned incentives. IGST refunds are recoverable tax, excluded from income.',
  },
];
export function calculate(rule: string, inputs: Record<string, any>) {
  const definition = calculationRules.find((r) => r.id === rule);
  if (!definition) throw new Error('Unknown calculation rule.');
  const n = (key: string) => {
    const value = Number(inputs[key]);
    if (
      inputs[key] === undefined ||
      inputs[key] === '' ||
      !Number.isFinite(value)
    )
      throw new Error(`${key} must be a finite number.`);
    return value;
  };
  const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
  if (rule === 'fx') {
    const amount = n('foreignAmount'),
      invoice = n('invoiceRate'),
      bank = n('bankRate'),
      charges = n('bankChargesInr');
    if (amount < 0 || invoice <= 0 || bank <= 0 || charges < 0)
      throw new Error('Amounts and rates must be positive.');
    return {
      cashInr: round(amount * bank - charges),
      invoiceSettlementInr: round(amount * invoice),
      fxGainInr: round(amount * (bank - invoice)),
      bankChargesInr: charges,
    };
  }
  if (rule === 'tax') {
    if (typeof inputs.interstate !== 'boolean')
      throw new Error('Choose interstate or intrastate tax treatment.');
    const base = n('taxableInr'),
      gstRate = n('gstRate'),
      tcsRate = n('tcsRate'),
      tdsRate = n('tdsRate');
    if ([gstRate, tcsRate, tdsRate].some((r) => r < 0 || r > 100))
      throw new Error('Tax rates must be between 0 and 100.');
    const gst = round((base * gstRate) / 100),
      tcs = round(((base + gst) * tcsRate) / 100),
      tds = round((base * tdsRate) / 100);
    return {
      gst,
      igst: inputs.interstate ? gst : 0,
      cgst: inputs.interstate ? 0 : round(gst / 2),
      sgst: inputs.interstate ? 0 : round(gst - round(gst / 2)),
      tcs,
      tds,
      payable: round(base + gst + tcs - tds),
    };
  }
  if (rule === 'incentive') {
    const fob = n('eligibleFobInr'),
      rate = n('rate'),
      cap = n('capInr');
    if (fob < 0 || rate < 0 || rate > 100 || cap < 0)
      throw new Error('Invalid incentive inputs.');
    return {
      entitlementInr: round(
        cap > 0 ? Math.min((fob * rate) / 100, cap) : (fob * rate) / 100,
      ),
    };
  }
  const sales = n('salesInr'),
    profit = round(
      sales -
        n('purchaseInr') -
        n('logisticsInr') -
        n('bankChargesInr') +
        n('fxGainInr') +
        n('earnedIncentivesInr'),
    );
  return {
    contributionInr: profit,
    marginPercent: sales ? round((profit / sales) * 100) : null,
  };
}
