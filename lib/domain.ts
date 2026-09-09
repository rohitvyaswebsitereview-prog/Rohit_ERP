export type RecordData = {
  id: string;
  kind: string;
  fy: string;
  version: number;
  created: string;
  [key: string]: any;
};
export const kinds = [
  'customers',
  'vendors',
  'products',
  'warehouses',
  'orders',
  'purchase-orders',
  'invoices',
  'bills',
  'journal',
  'movements',
  'exceptions',
  'tasks',
  'documents',
] as const;
export type Kind = (typeof kinds)[number];
export const masterKinds = ['customers', 'vendors', 'products', 'warehouses'];
export const accountNames: Record<string, string> = {
  '1000': 'Cash & Bank',
  '1300': 'Input GST',
  '1310': 'TCS Recoverable',
  '1320': 'TDS Receivable',
  '1400': 'Supplier Advances',
  '2100': 'Output GST',
  '2110': 'TDS Payable',
  '2120': 'TCS Payable',
  '2200': 'Customer Advances',
  '1100': 'Accounts Receivable',
  '1200': 'Inventory',
  '2000': 'Accounts Payable',
  '3000': 'Opening Equity',
  '4000': 'Sales Revenue',
  '5000': 'Cost of Goods Sold',
  '6000': 'Operating Expenses',
};
export function moneyMinor(value: unknown) {
  const s = String(value ?? '');
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw new Error(
      'Enter a non-negative amount with up to two decimal places.',
    );
  const [whole, fraction = ''] = s.split('.');
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(n) || n > 1e13)
    throw new Error('Amount is too large.');
  return n;
}
export function validDate(value: unknown) {
  const s = String(value || '');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw new Error('Enter a valid date.');
  return s;
}
export function fiscalYear(date: string) {
  const y = Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) < 4 ? 1 : 0);
  return `${y}–${String(y + 1).slice(-2)}`;
}
export function assertBalanced(lines: any[]) {
  if (!Array.isArray(lines) || lines.length < 2 || lines.length > 100)
    throw new Error('A journal needs 2–100 lines.');
  let debit = 0,
    credit = 0;
  for (const l of lines) {
    if (
      !l ||
      typeof l.account !== 'string' ||
      !Object.hasOwn(accountNames, l.account) ||
      !Number.isSafeInteger(l.debit) ||
      !Number.isSafeInteger(l.credit) ||
      l.debit < 0 ||
      l.credit < 0 ||
      !!l.debit === !!l.credit
    )
      throw new Error(
        'Each journal line needs a valid account and either a debit or credit.',
      );
    debit += l.debit;
    credit += l.credit;
    if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit))
      throw new Error('Journal total is too large.');
  }
  if (debit !== credit)
    throw new Error('Journal debits and credits must balance.');
  return debit;
}
export function ageing(due: string, today: string) {
  const days = Math.floor((Date.parse(today) - Date.parse(due)) / 86400000);
  return days <= 0
    ? 'Current'
    : days <= 30
      ? '1–30'
      : days <= 60
        ? '31–60'
        : days <= 90
          ? '61–90'
          : '90+';
}
export function dashboard(records: RecordData[], start: string, end: string) {
  const period = (r: RecordData) => r.date >= start && r.date <= end;
  const journals = records.filter(
    (r) => r.kind === 'journal' && r.status === 'Posted',
  );
  const balances: Record<string, Record<string, number>> = {};
  const trend: Record<string, any> = {};
  for (const j of journals.filter((r) => r.date <= end)) {
    const c = j.currency;
    balances[c] ??= {};
    for (const l of j.lines) {
      balances[c][l.account] =
        (balances[c][l.account] || 0) + l.debit - l.credit;
    }
  }
  for (const j of journals.filter(period)) {
    const key = j.date.slice(0, 7) + '|' + j.currency;
    trend[key] ??= {
      month: j.date.slice(0, 7),
      currency: j.currency,
      sales: 0,
      cost: 0,
      receipts: 0,
      payments: 0,
    };
    for (const l of j.lines) {
      if (l.account === '4000') trend[key].sales += l.credit - l.debit;
      if (l.account === '5000') trend[key].cost += l.debit - l.credit;
      if (l.account === '1000') {
        trend[key].receipts += l.debit;
        trend[key].payments += l.credit;
      }
    }
  }
  const currencies = [
    ...new Set([
      ...Object.keys(balances),
      ...journals.filter(period).map((r) => r.currency),
    ]),
  ];
  const totals = currencies.map((currency) => {
    const t = Object.values(trend).filter((x) => x.currency === currency);
    const sales = t.reduce((s, x) => s + x.sales, 0),
      cost = t.reduce((s, x) => s + x.cost, 0);
    return {
      currency,
      sales,
      profit: sales - cost,
      margin: sales ? ((sales - cost) / sales) * 100 : null,
      receivables: balances[currency]?.['1100'] || 0,
      payables: -(balances[currency]?.['2000'] || 0),
      cash: balances[currency]?.['1000'] || 0,
      receipts: t.reduce((s, x) => s + x.receipts, 0),
      payments: t.reduce((s, x) => s + x.payments, 0),
    };
  });
  const ageingRows = (kind: string) =>
    records
      .filter((r) => r.kind === kind && r.status === 'Posted' && r.date <= end)
      .map((r) => ({
        ...r,
        outstanding: r.amount,
        bucket: ageing(r.dueDate, end),
      }));
  return {
    totals,
    trend: Object.values(trend),
    receivables: ageingRows('invoices'),
    payables: ageingRows('bills'),
    orders: records.filter(
      (r) =>
        r.kind === 'orders' &&
        r.status !== 'Completed' &&
        r.status !== 'Cancelled' &&
        r.date <= end,
    ),
    exceptions: records
      .filter((r) => r.kind === 'exceptions' && r.status !== 'Resolved')
      .sort(
        (a, b) =>
          (({ Critical: 0, Warning: 1, Attention: 2 })[a.severity as string] ??
            3) -
            ({ Critical: 0, Warning: 1, Attention: 2 }[b.severity as string] ??
              3) || a.dueDate.localeCompare(b.dueDate),
      ),
    asOf: end,
    start,
    refreshedAt: new Date().toISOString(),
  };
}
