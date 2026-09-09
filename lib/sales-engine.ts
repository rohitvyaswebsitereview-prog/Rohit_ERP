import { moneyMinor, validDate } from './domain';
export const salesKinds = [
  'quotations',
  'sales-orders',
  'proformas',
  'invoices',
  'domestic-invoices',
];
export const salesTabs = [
  'General',
  'Commercial',
  'Items & Pricing',
  'Delivery',
  'Terms & Notes',
  'Internal Costing',
];
export const quoteStates: Record<string, string[]> = {
  Draft: ['Under Review'],
  'Under Review': ['Approved', 'Returned'],
  Returned: ['Draft'],
  Approved: ['Sent'],
  Sent: ['Viewed', 'Accepted', 'Rejected', 'Expired'],
  Viewed: ['Accepted', 'Rejected', 'Expired'],
  Accepted: [],
  Rejected: [],
  Expired: [],
  Revised: [],
  Converted: [],
};
export type SalesIssue = { field: string; section: string; message: string };
export const salesLabels: Record<string, string> = {
  quotations: 'Quotation',
  'sales-orders': 'Sales Order',
  proformas: 'Proforma Invoice',
  invoices: 'Commercial Invoice',
  'domestic-invoices': 'Domestic Invoice',
};
export function priceSales(input: any) {
  const num = (v: any, name: string, max = 1e9) => {
    if (v === '' || v === undefined || v === null) return 0;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max)
      throw new Error(name + ' must be a non-negative number.');
    return n;
  };
  const amount = (v: any) => moneyMinor(v === '' || v === undefined ? '0' : v);
  if (!Array.isArray(input.lines) || input.lines.length > 100)
    throw new Error('A document supports up to 100 items.');
  const lines = input.lines.map((l: any) => {
    const quantity = num(l.quantity, 'Quantity', 1e6),
      rate = amount(l.rate),
      discountPercent = num(l.discountPercent, 'Discount', 100),
      gstRate = ['Exempt', 'Export under LUT / bond'].includes(
        input.taxTreatment,
      )
        ? 0
        : num(l.gstRate, 'GST rate', 100),
      tcsRate = num(l.tcsRate, 'TCS rate', 100),
      tdsRate = num(l.tdsRate, 'TDS rate', 100);
    const gross = Math.round(quantity * rate),
      discount = Math.round((gross * discountPercent) / 100),
      net = gross - discount;
    const basic = input.taxInclusive
      ? Math.round(net / (1 + gstRate / 100))
      : net;
    let gst = input.taxInclusive
      ? net - basic
      : Math.round((basic * gstRate) / 100);
    const taxBase =
      input.withholdingBase === 'Tax inclusive' ? basic + gst : basic;
    let tcs = Math.round((taxBase * tcsRate) / 100),
      tds = Math.round((taxBase * tdsRate) / 100);
    const override = !!l.overrideEnabled;
    if (override) {
      if (!String(l.overrideReason || '').trim())
        throw new Error('Tax overrides require a reason.');
      if (
        l.gstOverride !== ' ' &&
        l.gstOverride !== '' &&
        l.gstOverride !== undefined
      )
        gst = amount(l.gstOverride);
      if (l.tcsOverride !== '' && l.tcsOverride !== undefined)
        tcs = amount(l.tcsOverride);
      if (l.tdsOverride !== '' && l.tdsOverride !== undefined)
        tds = amount(l.tdsOverride);
    }
    return {
      ...l,
      description: String(l.description || '').slice(0, 1000),
      quantity: String(l.quantity ?? ''),
      rate: String(l.rate ?? ''),
      gstRate: String(gstRate),
      tcsRate: String(tcsRate),
      tdsRate: String(tdsRate),
      gross,
      discount,
      basic,
      gst,
      tcs,
      tds,
      other: 0,
      rounding: 0,
      total: basic + gst + tcs - tds,
      charges: '0',
      roundOff: '0',
    };
  });
  const sum = (key: string) =>
    lines.reduce((n: number, l: any) => n + l[key], 0);
  const charges = ['freight', 'insurance', 'packing', 'otherCharges'].reduce(
    (n, k) => n + amount(input[k]),
    0,
  );
  const round = String(input.roundOff || '0'),
    rounding = round.startsWith('-')
      ? -moneyMinor(round.slice(1))
      : moneyMinor(round);
  const gst = sum('gst'),
    cgst =
      input.quotationType === 'Domestic' && input.gstSplit === 'CGST + SGST'
        ? Math.floor(gst / 2)
        : 0,
    sgst =
      input.quotationType === 'Domestic' && input.gstSplit === 'CGST + SGST'
        ? gst - cgst
        : 0;
  const result = {
    subtotal: sum('gross'),
    discount: sum('discount'),
    taxable: sum('basic'),
    gst,
    cgst,
    sgst,
    igst: gst - cgst - sgst,
    tcs: sum('tcs'),
    tds: sum('tds'),
    charges,
    rounding,
    total: sum('total') + charges + rounding,
  };
  if (!Number.isSafeInteger(result.total) || Math.abs(result.total) > 1e13)
    throw new Error('Document total exceeds the supported amount.');
  return { lines, totals: result };
}
export function salesIssues(d: any): SalesIssue[] {
  const issues: SalesIssue[] = [];
  const need = (field: string, section: string, message: string) => {
    if (!d[field]) issues.push({ field, section, message });
  };
  need('partnerId', 'General', 'Select a customer.');
  need('salesPersonId', 'General', 'Select a salesperson.');
  need('billingAddress', 'General', 'Billing address is missing.');
  need('shippingAddress', 'General', 'Shipping address is missing.');
  need('currencyId', 'Commercial', 'Select a currency.');
  need('paymentTermsId', 'Commercial', 'Select payment terms.');
  need('taxTreatment', 'Commercial', 'Select tax treatment.');
  try {
    validDate(d.date);
  } catch {
    issues.push({
      field: 'date',
      section: 'General',
      message: 'Enter a valid document date.',
    });
  }
  try {
    validDate(d.validUntil);
  } catch {
    issues.push({
      field: 'validUntil',
      section: 'General',
      message: 'Enter a valid expiry date.',
    });
  }
  if (
    !d.validUntil ||
    !/^\d{4}-\d{2}-\d{2}$/.test(d.validUntil) ||
    d.validUntil <= d.date
  )
    issues.push({
      field: 'validUntil',
      section: 'General',
      message: 'Valid Until must be later than the document date.',
    });
  if (!['Domestic', 'Export'].includes(d.quotationType))
    issues.push({
      field: 'quotationType',
      section: 'General',
      message: 'Select Domestic or Export.',
    });
  if (
    d.taxTreatment &&
    ![
      'GST Registered',
      'Unregistered',
      'Exempt',
      'Export with tax',
      'Export under LUT / bond',
    ].includes(d.taxTreatment)
  )
    issues.push({
      field: 'taxTreatment',
      section: 'Commercial',
      message: 'Select a valid tax treatment.',
    });
  if (
    d.quotationType === 'Export' &&
    (!Number.isFinite(Number(d.exchangeRate)) || Number(d.exchangeRate) <= 0)
  )
    issues.push({
      field: 'exchangeRate',
      section: 'Commercial',
      message: 'Exchange rate must be positive.',
    });
  if (d.quotationType === 'Domestic') {
    need('placeOfSupply', 'Commercial', 'Enter place of supply.');
    if (
      d.taxTreatment === 'GST Registered' &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
        d.customerGstin || '',
      )
    )
      issues.push({
        field: 'customerGstin',
        section: 'General',
        message: 'Enter the customer’s 15-character GSTIN.',
      });
  } else
    for (const [field, message] of [
      ['exchangeRate', 'Enter an exchange rate.'],
      ['shipmentTermsId', 'Select an Incoterm.'],
      ['loadingPortId', 'Select a port of loading.'],
      ['dischargePortId', 'Select a port of discharge.'],
      ['destinationCountry', 'Enter destination country.'],
      ['originCountry', 'Enter country of origin.'],
      ['shipmentMode', 'Select shipment mode.'],
    ])
      need(field, 'Delivery', message);
  if (!d.lines?.length)
    issues.push({
      field: 'lines',
      section: 'Items & Pricing',
      message: 'Add at least one item.',
    });
  for (const [i, l] of (d.lines || []).entries()) {
    if (
      !l.productId ||
      !l.description ||
      !l.uom ||
      !l.taxCodeId ||
      Number(l.quantity) <= 0 ||
      l.rate === '' ||
      l.rate === undefined
    )
      issues.push({
        field: 'line-' + i,
        section: 'Items & Pricing',
        message: `Item ${i + 1}: select a product, UOM and tax code; enter description, positive quantity and unit price.`,
      });
  }
  try {
    const p = priceSales({ ...d, lines: d.lines || [] });
    if (p.totals.total <= 0)
      issues.push({
        field: 'lines',
        section: 'Items & Pricing',
        message: 'Grand total must be positive.',
      });
  } catch (e: any) {
    issues.push({
      field: 'lines',
      section: 'Items & Pricing',
      message: e.message,
    });
  }
  return issues;
}
export function safeSalesDocument(r: any) {
  const d = { ...r };
  delete d.internalCosting;
  delete d.internalNotes;
  delete d.costs;
  return d;
}
