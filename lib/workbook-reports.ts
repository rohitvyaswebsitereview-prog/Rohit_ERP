export type WorkbookFact = Record<string, any>;
export type WorkbookTable = {
  key: string;
  title: string;
  note: string;
  columns: { key: string; label: string; type?: string }[];
  rows: Record<string, any>[];
};
export const numeric = (v: unknown) =>
  typeof v === 'boolean' ||
  v === null ||
  v === undefined ||
  String(v).trim() === ''
    ? 0
    : Number.isFinite(Number(v))
      ? Number(v)
      : 0;
const minor = (v: unknown) => Math.round(numeric(v) * 100);
const add = (rows: WorkbookFact[], k: string) =>
  rows.reduce((s, r) => s + minor(r[k]), 0);
const age = (d: string, asOf: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d || '')
    ? Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(d)) / 86400000))
    : null;
const key = (v: unknown) => String(v ?? '').trim();
function group(rows: WorkbookFact[], get: (r: WorkbookFact) => string) {
  const m = new Map<string, WorkbookFact[]>();
  for (const r of rows) {
    const k = get(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return [...m.entries()];
}
const moneyKeys = new Set([
  'amount',
  'value',
  'basic',
  'invoiceValue',
  'paid',
  'pending',
  'advance',
  'balance',
  'gst',
  'sgst',
  'cgst',
  'igst',
  'tcs',
  'tds',
  'sales',
  'purchase',
  'expenses',
  'profit',
  'received',
  'charges',
  'fx',
  'entitlement',
  'net',
  'cashInr',
  'sourceFx',
]);
function table(
  k: string,
  title: string,
  note: string,
  labels: Record<string, string>,
  rows: Record<string, any>[],
): WorkbookTable {
  return {
    key: k,
    title,
    note,
    columns: Object.entries(labels).map(([key, label]) => ({
      key,
      label,
      type: moneyKeys.has(key) ? 'money' : undefined,
    })),
    rows,
  };
}
export function workbookReports(
  facts: WorkbookFact[],
  fy = '2026–27',
  asOf = new Date().toISOString().slice(0, 10),
) {
  const available = facts.filter((f) => !f.date || f.date <= asOf),
    sales = available.filter(
      (f) => f.domain === 'sales' && (fy === 'All' || f.fy === fy),
    ),
    purchases = available.filter((f) => f.domain === 'purchase'),
    expenses = available.filter((f) => f.domain === 'expense');
  const salesGroups = group(
      sales.filter((f) => f.invoice),
      (f) => f.invoice + '\0' + f.party,
    ),
    purchaseGroups = group(
      purchases.filter((f) => f.party),
      (f) => f.party + '\0' + f.invoice,
    );
  const tables: WorkbookTable[] = [];
  const invoiceRows = salesGroups.map(([_, rs]) => {
    const f =
        rs.find((r) => numeric(r.usd) || numeric(r.invoiceValue)) || rs[0],
      invoiceUsd = add(rs, 'usd'),
      receivedUsd = add(rs, 'settledUsd'),
      exchange = numeric(f.exchangeRate),
      invoiceInr =
        invoiceUsd > 0
          ? Math.round(invoiceUsd * exchange) - add(rs, 'tcs')
          : add(rs, 'invoiceValue') - add(rs, 'tcs'),
      paidInr =
        invoiceUsd > 0 ? Math.round(receivedUsd * exchange) : add(rs, 'paid');
    return {
      reference: f.invoice,
      party: f.party,
      date: f.date,
      id: f.recordId,
      kind: f.recordKind,
      invoiceUsd,
      receivedUsd,
      invoiceInr,
      paidInr,
      fx: rs.reduce(
        (n, r) =>
          n +
          Math.round(
            numeric(r.settledUsd) *
              (numeric(r.conversionRate) - exchange) *
              100,
          ),
        0,
      ),
      bankRef: [...new Set(rs.map((r) => key(r.bankRef)).filter(Boolean))].join(
        ', ',
      ),
      sourceRows: rs.map((r) => r.row).join(', '),
    };
  });
  for (const currency of ['USD', 'INR']) {
    const rows = invoiceRows
      .map((r) => {
        const value = currency === 'USD' ? r.invoiceUsd : r.invoiceInr,
          paid = currency === 'USD' ? r.receivedUsd : r.paidInr,
          net = value - paid;
        return {
          ...r,
          value,
          paid,
          pending: net > 100 ? net : 0,
          advance: net < -100 ? -net : 0,
          days: net > 100 ? age(r.date, asOf) : 0,
          status:
            net < -100
              ? 'Overpaid'
              : !paid
                ? 'Pending'
                : net <= 100
                  ? 'Received'
                  : 'Partly paid',
        };
      })
      .filter((r) => Math.abs(r.value) > 100);
    for (const [party, rs] of group(
      sales.filter((r) => r.type === 'Advance Receipts'),
      (r) => r.party,
    )) {
      const amount = add(rs, currency === 'USD' ? 'settledUsd' : 'paid');
      if (amount > 100)
        rows.push({
          reference: 'Unallocated advance',
          party,
          date: '',
          value: 0,
          paid: amount,
          pending: 0,
          advance: amount,
          days: 0,
          status: 'Advance',
          id: rs[0].paymentRecordId,
          kind: 'customer-advances',
          bankRef: rs.map((r) => r.bankRef).join(', '),
        } as any);
    }
    tables.push(
      table(
        'debtors-' + currency.toLowerCase(),
        'Customer balances · ' + currency,
        'Receipts include allocated bank charges in USD. INR export balances use the invoice exchange rate, separate from GST refunds and realised currency differences. Workbook tolerance: 1 currency unit.',
        {
          reference: 'Invoice',
          party: 'Customer',
          date: 'Invoice date',
          value: 'Invoice value',
          paid: 'Settled',
          pending: 'Pending',
          advance: 'Advance / overpaid',
          days: 'Age (days)',
          status: 'Status',
          bankRef: 'Bank reference',
        },
        rows,
      ),
    );
  }
  const supplierRows = purchaseGroups.map(([_, rs]) => {
    const f = rs.find((r) => r.type === 'Purchase') || rs[0],
      value = f.invoice ? add(rs, 'payable') : 0,
      paid = add(rs, 'paid'),
      difference = value - paid,
      balance = Math.abs(difference) <= 99 ? 0 : difference;
    return {
      reference: f.invoice || 'Unallocated advance',
      party: f.party,
      date: f.date,
      value,
      paid,
      balance,
      pending: Math.max(0, balance),
      advance: Math.max(0, -balance),
      status: !f.invoice
        ? 'Advance'
        : balance === 0
          ? 'Fully paid'
          : balance > 0
            ? 'Balance outstanding'
            : 'Overpaid / credit',
      id: f.recordId || f.paymentRecordId,
      kind: f.recordKind || 'supplier-advances',
      bankRef: [...new Set(rs.map((r) => key(r.bankRef)).filter(Boolean))].join(
        ', ',
      ),
    };
  });
  tables.push(
    table(
      'supplier-payments',
      'Supplier payments and reconciliation',
      'Invoice keys include the supplier. Part payments are added once. Unallocated advances do not create purchase invoices. Values in INR; workbook tolerance ₹0.99.',
      {
        party: 'Supplier',
        reference: 'Invoice',
        date: 'Invoice date',
        value: 'Payable',
        paid: 'Paid',
        balance: 'Balance',
        status: 'Status',
        bankRef: 'Bank reference',
      },
      supplierRows,
    ),
  );
  const creditorRows = group(supplierRows, (r) => r.party)
    .map(([party, rs]) => ({
      party,
      pending: rs.reduce((n, r) => n + r.pending, 0),
      advance: rs.reduce((n, r) => n + r.advance, 0),
      net: rs.reduce((n, r) => n + r.balance, 0),
    }))
    .filter((r) => r.pending > 100 || r.advance > 100);
  tables.push(
    table(
      'net-creditors',
      'Net creditors',
      'Outstanding invoices and supplier advances are shown separately before netting. Includes all purchase dates present in the workbook up to the selected date.',
      {
        party: 'Supplier',
        pending: 'Outstanding',
        advance: 'Advance / credit',
        net: 'Net balance',
      },
      creditorRows,
    ),
  );
  const inventory = purchases
    .filter((r) => r.type === 'Purchase' && r.serial && numeric(r.basic))
    .map((f) => {
      const s = key(f.inventoryStatus).toLowerCase();
      return {
        serial: f.serial,
        type: f.machineType,
        model: f.model,
        brand: f.brand,
        party: f.party,
        reference: f.invoice,
        date: f.date,
        value: minor(f.basic),
        status:
          s === 'sold'
            ? 'Sold'
            : s === 'consumed'
              ? 'Consumed'
              : s === '' || s === 'not sold'
                ? 'In stock'
                : f.inventoryStatus,
        days: s === '' || s === 'not sold' ? age(f.date, asOf) : null,
        id: f.machineRecordId || f.recordId,
        kind: f.machineRecordId ? 'machines' : f.recordKind,
        linked: f.linkedInvoice,
        location: f.shipTo || 'Not supplied',
      };
    });
  tables.push(
    table(
      'inventory',
      'Inventory and machine lifecycle',
      'Includes the original serial descriptions, including spare-parts bundles. Consumed parts remain distinct from sold machines. Location is not inferred.',
      {
        serial: 'Serial / item reference',
        type: 'Machine type',
        brand: 'Brand',
        model: 'Model',
        party: 'Supplier',
        reference: 'Purchase invoice',
        date: 'Purchase date',
        value: 'Purchase cost (INR)',
        status: 'Status',
        days: 'Holding days',
        linked: 'Linked invoice',
        location: 'Location',
      },
      inventory,
    ),
  );
  tables.push(
    table(
      'advances',
      'Supplier advances',
      'Advance payment amounts, dates and references are imported independently of estimated order values.',
      {
        party: 'Supplier',
        date: 'Payment date',
        amount: 'Advance paid (INR)',
        bankRef: 'Bank reference',
        days: 'Days since payment',
      },
      purchases
        .filter((f) => f.type === 'Advance')
        .map((f) => ({
          party: f.party,
          date: f.paymentDate,
          amount: minor(f.paid),
          bankRef: f.bankRef,
          days: age(f.paymentDate, asOf),
          id: f.paymentRecordId,
          kind: 'supplier-advances',
        })),
    ),
  );
  const gp = salesGroups
    .map(([_, rs]) => {
      const f = rs[0],
        ps = purchases.filter((p) => key(p.linkedInvoice) === f.invoice),
        es = expenses.filter((e) => key(e.linkedInvoice) === f.invoice),
        s = add(rs, 'basic'),
        p = add(ps, 'basic'),
        e = add(es, 'basic');
      return {
        reference: f.invoice,
        party: f.party,
        sales: s,
        purchase: p,
        expenses: e,
        profit: s - p - e,
        id: f.recordId,
        kind: f.recordKind,
        coverage:
          !ps.length && s > 0
            ? 'Purchase cost not linked'
            : !es.length && s > 0
              ? 'No linked expenses recorded'
              : 'Source links present',
      };
    })
    .filter((r) => r.sales || r.purchase || r.expenses);
  tables.push(
    table(
      'gross-profit',
      'Invoice profitability',
      'Sales taxable value less directly linked purchase cost and expenses, before export incentives and FX. Missing costs and shared unallocated expenses may overstate profit; these remain visible in the review list.',
      {
        reference: 'Sales invoice',
        party: 'Customer',
        sales: 'Sales (INR)',
        purchase: 'Purchase cost',
        expenses: 'Linked expenses',
        profit: 'Provisional gross profit',
        coverage: 'Cost coverage',
      },
      gp,
    ),
  );
  tables.push(
    table(
      'shared-expenses',
      'Expenses requiring allocation',
      'No equal split is assumed for expenses linked to several invoices or without a matching invoice.',
      {
        party: 'Supplier',
        reference: 'Expense invoice',
        linked: 'Source link',
        date: 'Date',
        basic: 'Taxable value (INR)',
        reason: 'Allocation status',
      },
      expenses
        .filter(
          (e) =>
            !e.linkedInvoice ||
            e.linkedInvoice.includes(',') ||
            !sales.some((s) => s.invoice === e.linkedInvoice),
        )
        .map((e) => ({
          party: e.party,
          reference: e.invoice,
          linked: e.linkedInvoice,
          date: e.date,
          basic: minor(e.basic),
          reason: e.linkedInvoice?.includes(',')
            ? 'Allocation split needed'
            : e.linkedInvoice
              ? 'Outside selected sales period / different reference'
              : 'No invoice link',
          id: e.recordId,
          kind: e.recordKind,
        })),
    ),
  );
  const refunds = salesGroups
    .map(([_, rs]) => {
      const f = rs[0],
        entitlement = add(rs, 'igst'),
        received = rs
          .filter((r) => r.igstDate)
          .reduce((n, r) => n + minor(r.igstReceived), 0);
      return {
        reference: f.invoice,
        party: f.party,
        shippingBill: f.shippingBill,
        entitlement,
        received,
        pending:
          Math.max(0, entitlement - received) > 100
            ? Math.max(0, entitlement - received)
            : 0,
        status: !received
          ? 'Pending'
          : received - entitlement > 1000000
            ? 'Excess — verify'
            : received >= entitlement - 100
              ? 'Received'
              : 'Partial',
        id: f.recordId,
        kind: f.recordKind,
      };
    })
    .filter((r) => r.entitlement > 100);
  tables.push(
    table(
      'igst',
      'IGST refund reconciliation',
      'Rebuilt from the source invoice and dated refund rows. Credit notes net against their original references. This replaces the workbook’s failed IGST formula; it is not a filed return.',
      {
        reference: 'Invoice',
        party: 'Customer',
        shippingBill: 'Shipping bill',
        entitlement: 'IGST (INR)',
        received: 'Refund received',
        pending: 'Refund pending',
        status: 'Status',
      },
      refunds,
    ),
  );
  tables.push(
    table(
      'incentives',
      'Export incentives and foreign exchange',
      'Receipt totals exclude worksheet total rows. FX is recomputed using the linked invoice rate; original workbook formulas remain available in Source Sheets.',
      {
        reference: 'Invoice',
        party: 'Customer',
        entitlement: 'DBK entitlement (INR)',
        received: 'DBK received',
        basic: 'RoDTEP entitlement',
        sourceFx: 'FX in original workbook',
        fx: 'FX at linked invoice rate',
      },
      salesGroups.map(([_, rs]) => ({
        reference: rs[0].invoice,
        party: rs[0].party,
        entitlement: add(rs, 'dbk'),
        received: add(rs, 'dbkReceived'),
        basic: add(rs, 'rodtep'),
        sourceFx: add(rs, 'fx'),
        fx:
          invoiceRows.find(
            (r) => r.reference === rs[0].invoice && r.party === rs[0].party,
          )?.fx || 0,
        id: rs[0].recordId,
        kind: rs[0].recordKind,
      })),
    ),
  );
  tables.push(
    table(
      'inward',
      'Bank receipt allocations',
      'Each source receipt allocation is included once. A shared bank reference can cover multiple invoices; it is not evidence of a duplicate payment.',
      {
        bankRef: 'Bank reference',
        reference: 'Invoice',
        party: 'Customer',
        date: 'Receipt date',
        received: 'Cash USD',
        charges: 'Charges USD',
        amount: 'Settled USD',
        cashInr: 'Cash INR',
      },
      sales
        .filter((f) => f.hasPayment)
        .map((f) => ({
          bankRef: f.bankRef,
          reference: f.invoice,
          party: f.party,
          date: f.paymentDate,
          received: minor(f.cashUsd),
          charges: minor(f.charges),
          amount: minor(f.settledUsd),
          cashInr: minor(f.paid),
          id: f.paymentRecordId,
          kind:
            f.type === 'Advance Receipts' ? 'customer-advances' : 'receipts',
        })),
    ),
  );
  tables.push(
    table(
      'gst-register',
      'Sales GST working register',
      'Source transaction values with actual CGST and SGST retained. Payment-only rows and matched cancelled invoice/credit-note pairs are excluded. Credit notes are separate negative rows. Verify exceptions before statutory filing.',
      {
        reference: 'Invoice',
        type: 'Transaction type',
        date: 'Date',
        party: 'Customer',
        basic: 'Taxable (INR)',
        cgst: 'CGST',
        sgst: 'SGST',
        igst: 'IGST',
        invoiceValue: 'Invoice value',
        shippingBill: 'Shipping bill',
        port: 'Port',
      },
      sales
        .filter(
          (f) =>
            numeric(f.invoiceValue) &&
            !f.type.includes('Cancelled') &&
            !(
              f.type === 'Credit Note' &&
              sales.some(
                (r) => r.invoice === f.invoice && r.type.includes('Cancelled'),
              )
            ),
        )
        .map((f) => ({
          reference: f.invoice,
          type: f.type,
          date: f.date,
          party: f.party,
          basic: minor(f.basic),
          cgst: minor(f.cgst),
          sgst: minor(f.sgst),
          igst: minor(f.igst),
          invoiceValue: minor(f.invoiceValue),
          shippingBill: f.shippingBill,
          port: f.port,
          id: f.recordId,
          kind: f.recordKind,
        })),
    ),
  );
  tables.push(
    table(
      'tds',
      'TDS source schedule',
      'Deduction/deposit dates and interest are retained from the workbook. Missing dates stay blank; source “Correct” labels are not treated as confirmation of statutory compliance.',
      {
        reference: 'Purchase invoice',
        party: 'Supplier',
        tds: 'TDS (INR)',
        deductionDue: 'Source deduction date',
        deducted: 'Actual deduction',
        depositDue: 'Source deposit due',
        deposited: 'Actual deposit',
        status: 'Recorded dates',
      },
      purchases
        .filter((f) => numeric(f.tds))
        .map((f) => ({
          reference: f.invoice,
          party: f.party,
          tds: minor(f.tds),
          deductionDue: f.tdsDeductionDue,
          deducted: f.tdsDeducted,
          depositDue: f.tdsDepositDue,
          deposited: f.tdsDeposited,
          status:
            !f.tdsDeducted || !f.tdsDeposited
              ? 'Dates missing'
              : f.tdsDeductionStatus + ' / ' + f.tdsDepositStatus,
          id: f.recordId,
          kind: f.recordKind,
        })),
    ),
  );
  tables.push(
    table(
      'monthly',
      'Monthly sales and purchases',
      'Transaction rows only, grouped by actual invoice month and source transaction type. Advances and payment-only rows are excluded.',
      {
        month: 'Month',
        domain: 'Register',
        type: 'Transaction type',
        basic: 'Taxable value (INR)',
        invoiceValue: 'Invoice value (INR)',
      },
      group(
        available.filter(
          (f) =>
            (fy === 'All' || f.fy === fy) &&
            numeric(f.invoiceValue) &&
            ![
              'Advance',
              'Advance Receipts',
              'Part Receipts',
              'Part Payment',
            ].includes(f.type),
        ),
        (f) => f.date.slice(0, 7) + '\0' + f.domain + '\0' + f.type,
      ).map(([k, rs]) => ({
        month: k.split('\0')[0],
        domain: rs[0].domain,
        type: rs[0].type,
        basic: add(rs, 'basic'),
        invoiceValue: add(rs, 'invoiceValue'),
      })),
    ),
  );
  return tables;
}
