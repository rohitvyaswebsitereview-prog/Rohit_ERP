import { Entity, inactive, entityLabel } from './relationships';
export function financial360(records: Entity[], fy: string) {
  const active = records.filter((r) => !inactive(r));
  const lines: any[] = [];
  for (const invoice of active.filter((r) =>
    ['invoices', 'domestic-invoices', 'purchase-invoices', 'expenses'].includes(
      r.kind,
    ),
  )) {
    const sales = ['invoices', 'domestic-invoices'].includes(invoice.kind),
      usd = sales && Number(invoice.totalUsd) > 0,
      currency = usd ? 'USD' : invoice.currency || 'INR';
    const amount = usd
      ? Math.round(Number(invoice.totalUsd) * 100)
      : Number(invoice.amount || 0);
    const payments = active.filter(
      (p) =>
        (sales ? p.kind === 'receipts' : p.kind === 'payments') &&
        [p.sourceId, p.invoiceId].includes(invoice.id) &&
        p.currency === currency,
    );
    const settled = payments.reduce(
      (s, p) => s + Number(p.settledAmount ?? p.amount ?? 0),
      0,
    );
    lines.push({
      id: invoice.id,
      reference: entityLabel(invoice),
      type: sales ? 'Receivable' : 'Payable',
      currency,
      amount,
      settled,
      balance: amount - settled,
      date: invoice.date,
      fy: invoice.fy,
      posting: invoice.importLocked
        ? 'Historical — not posted'
        : invoice.status,
    });
  }
  const groups: any = {};
  for (const row of lines) {
    const key = row.type + ' · ' + row.currency;
    if (!groups[key])
      groups[key] = { label: key, currency: row.currency, balance: 0, ytd: 0 };
    groups[key].balance += row.balance;
    if (row.fy === fy) groups[key].ytd += row.amount;
  }
  return {
    lines,
    summary: Object.values(groups),
    note: 'Invoice balances exclude unallocated credit/debit notes and advances; review those separately in related transactions. USD export balances exclude recoverable GST. Only explicitly allocated receipts/payments in the same currency reduce balances. Confirmed relationships do not allocate shared costs or convert currencies.',
  };
}
