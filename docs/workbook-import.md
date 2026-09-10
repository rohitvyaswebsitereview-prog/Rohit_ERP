# Workbook data import

The import retains the original XLSX bytes and every populated cell, including original formulas, cached results, comments, formats, hyperlinks, hidden-sheet/row/column metadata and table definitions. Blank layout and other native Excel objects remain in the downloadable original. No workbook authoring or Excel save is performed.

The source registers are Sales, Purchase, Expenses and the prior-year raw-data sheet. All other sheets are retained as reference/report output rather than imported as additional financial transactions. Source facts retain exact decimal text; ERP monetary fields use rounded integer minor units. Transaction dates determine fiscal year, including earlier purchase dates that appear in the current workbook.

## Record mapping

Customers and suppliers are matched by trimmed, case-insensitive names within this import; differing GST registrations are flagged and all source registrations remain accessible. Products use brand, machine type, model and HSN. Original serial identifiers are preserved, including characters that fail the workbook's advisory patterns. Descriptions such as “Multiple Parts” do not become fabricated individual machine serials.

Sales invoices, sales credit notes, purchase invoices, purchase debit notes and expenses are separate record types. Lines belonging to one supplier invoice are grouped. Payment-only rows do not become new invoices. Receipts and payments retain their individual source-row allocations even when bank references are shared. Unallocated advances do not create purchase invoices. Missing dates, unknown warehouse locations and missing cost allocation splits are not invented.

Shipping bills, bills of lading, eBRC records, export incentives and machine records link to their source invoice when that relationship is supplied. Every imported transaction opens its original worksheet rows inside the ERP. Current and prior-year sales remain separate by fiscal year.

Historical financial records are locked against editing/reposting and are not represented as fully posted general-ledger entries. The workbook lacks a complete opening trial balance and bank ledger. Operational reconciliation reports are available independently of the general ledger. A ledger migration requires resolved source exceptions and opening balances; no balancing journal or invented equity entry is added.

## Recreated calculations

The report date filters source invoice dates and controls ageing. Payments, refunds and stock states reflect the saved workbook snapshot; these reports do not reconstruct historical balances at the selected date.

- USD customer debt: invoice CIF value less allocated receipts including recorded bank charges. Partial receipts group under the invoice. INR export balances use the invoice FX rate rather than cash conversion FX. GST refunds remain separate.
- Supplier reconciliation: supplier plus invoice identity, net payable less all allocated payments, with the workbook's ₹0.99 balance tolerance. Advances and outstanding bills are shown separately before netting.
- Inventory: purchase rows with serial/item descriptions; in-stock, sold and consumed states remain distinct. Holding age uses the selected report date.
- Invoice profitability: taxable sales less explicitly linked purchase costs and expenses. Shared, unknown and out-of-period allocations remain visible and are not arbitrarily split. Coverage warnings prevent missing costs from being presented as fully verified margins.
- Incentives: sum source transaction rows, excluding worksheet totals. Source FX and FX recomputed from the linked invoice rate are both inspectable.
- IGST: original tax and dated refund allocations, net of credit notes. The ERP calculation is independent of the source's failed spill formula.
- Sales GST working register: preserves actual central/state taxes, excludes payment-only rows and matched cancelled invoice/credit pairs. This is a working register, not a filed return.
- TDS: source schedule, deduction and deposit fields remain traceable; missing/1900 placeholder dates stay unavailable. The source's “Correct” label is not a certification of compliance.
- Monthly source-register summaries use actual transaction dates and retain transaction categories.

## Source exceptions

The import review distinguishes original formula errors, missing payment dates, source serial warnings, conflicting registrations, sub-paise precision, repeated expense values, shared unallocated expenses and unmatched references. Specific source defects include a drawback whole-column sum that includes its own total, an incomplete gross-profit summation range, a positional stock reference and receipt FX calculations without invoice exchange rates. These findings do not authorize silently changing original data. Duplicate/ambiguous expenses remain preserved pending business clarification.

## Local workflow and verification

Run the import script with a workbook, tenant and private output directory to produce a plan. Applying requires an explicit local database argument and `--apply`. Test on a private SQLite backup first. The import writes one transaction and checks existing record preservation, archived cell coverage and database integrity. Repeating the same source hash is a no-op. A changed revision with the same filename is rejected pending reconciliation instead of duplicated.

Source workbook contents, generated plans, backups and database files stay in ignored local storage. Only generic software and synthetic tests belong in Git. Verification includes source-to-report row comparisons, exact original-file hashing, repeat-import checks, role/tenant access checks, prevention of duplicate posting, TypeScript compilation, integration tests and production build. Native Excel recalculation and authenticated visual acceptance are not claimed.
