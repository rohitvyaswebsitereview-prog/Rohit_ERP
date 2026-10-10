export function searchPath(query: string, fy: string, allYears = false) {
  return 'relationships/search?q=' + encodeURIComponent(query.trim()) +
    '&view=All%20data' + (allYears ? '' : '&fy=' + encodeURIComponent(fy));
}

export function taxWorkingRows<T extends { status?: string }>(rows: T[]) {
  return rows.filter(row => row.status === 'Posted');
}

export function grossProfitPresentation(total: {
  margin?: number | null;
  costCoverage?: { complete: boolean; missingInvoiceIds: string[] };
}) {
  const missing = total.costCoverage?.missingInvoiceIds.length || 0;
  return total.costCoverage?.complete === false ? {
    label: 'Provisional gross profit',
    margin: null,
    note: missing ? `Cost missing for ${missing} posted invoice${missing === 1 ? '' : 's'}` : 'Cost coverage unavailable for posted sales',
  } : {
    label: 'Gross Profit',
    margin: total.margin ?? null,
    note: '',
  };
}

export function stockValueSummary(rows: { currency?: string; quantity?: number; value?: number }[]) {
  const groups = new Map<string, { currency: string; quantity: number; value: number; missingValues: number }>();
  for (const row of rows) {
    const currency = row.currency || 'Unknown';
    const group = groups.get(currency) || { currency, quantity: 0, value: 0, missingValues: 0 };
    if (Number.isFinite(row.value)) {
      group.quantity += Number(row.quantity || 0);
      group.value += Number(row.value);
    } else group.missingValues += 1;
    groups.set(currency, group);
  }
  return [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export function companyExportRow(record: { name?: string; tradeName?: string; gstin?: string; email?: string; status?: string }) {
  return {
    legalName: record.name || '',
    tradingName: record.tradeName || '',
    gstin: record.gstin || '',
    email: record.email || '',
    status: record.status || '',
  };
}
