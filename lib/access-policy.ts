const viewerMask = new Set([
  'gstin', 'customerGstin', 'pan', 'accountNumber', 'iec', 'taxRegistrations',
]);
const privateFields = new Set([
  'internalCosting', 'internalNotes', 'costs', 'sales-internal', 'password', 'token',
]);
const financialFields = new Set([
  'amount', 'cost', 'costs', 'rate', 'price', 'value', 'total', 'totals',
  'currency', 'currencyId', 'exchangeRate', 'creditLimit', 'defaultRate',
  'bankAccounts', 'bankName', 'bankId', 'accountNumber', 'gstin', 'customerGstin',
  'pan', 'taxRegistrations', 'internalCosting', 'internalNotes', 'profit',
  'margin', 'basic', 'gst', 'tcs', 'tds', 'debit', 'credit', 'balance',
  'stockValue', 'stockCurrency', 'unitCost', 'totalUsd', 'settledAmount',
  'outstanding', 'sales', 'receipts', 'payments', 'other', 'rounding',
  'bankChargesInr', 'bankChargesUsd', 'foreignAmount', 'invoiceRate',
  'bankRate', 'discount', 'freight', 'insurance', 'profitability',
]);
const financialName = /^(?:amount|cost|value|price|balance|profit|margin|currency|rate|payable|receivable|tax|gst|tcs|tds|rounding|discount|freight|insurance|settled|outstanding|bankCharges)(?:$|[A-Z])|(?:Amount|Cost|Value|Price|Balance|Profit|Margin|Currency|Rate|Payable|Receivable|Tax|GST|TCS|TDS|Rounding|Discount|Freight|Insurance|Settled|Outstanding|BankCharges)(?:$|[A-Z])/;

function masked(value: unknown): string {
  const string = String(value ?? '');
  return '••••' + string.slice(-4);
}

/** Remove role-restricted fields from any API payload, including nested history. */
export function redactAccess<T>(value: T, role: string): T {
  if (!['Viewer', 'Logistics'].includes(role)) return value;
  const visit = (item: unknown, key = '', inBank = false): unknown => {
    if (typeof item === 'string' && key === 'detail') return 'Details restricted to authorised editors.';
    if (Array.isArray(item)) return item.map((entry) => visit(entry, key, inBank));
    if (!item || typeof item !== 'object') return item;
    const obj = item as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const changedField = typeof obj.field === 'string' ? obj.field : '';
    for (const [field, child] of Object.entries(obj)) {
      if (privateFields.has(field) || (role === 'Logistics' && (financialFields.has(field) || financialName.test(field)))) continue;
      if (role === 'Viewer' && (viewerMask.has(field) || (inBank && ['number', 'iban', 'swift'].includes(field)))) {
        out[field] = typeof child === 'string' ? masked(child) : undefined;
        continue;
      }
      if (['before', 'after'].includes(field) && changedField) {
        if (privateFields.has(changedField) || (role === 'Logistics' && (financialFields.has(changedField) || financialName.test(changedField)))) continue;
        if (role === 'Viewer' && viewerMask.has(changedField)) {
          out[field] = masked(child);
          continue;
        }
      }
      out[field] = visit(child, field, inBank || field === 'bankAccounts');
    }
    return out;
  };
  return visit(value) as T;
}
