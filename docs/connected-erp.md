# Connected ERP implementation

The application keeps its existing registers, posting guards, masters, forms and historical source archive. A shared relationship service and record workspace now connect those capabilities. The local workbook and its contents remain private.

## Architecture and data contract

`records` remains the entity store. Domain references required for posting remain first-class fields. `entity_relationships` adds a cross-module layer with tenant, source/target type and identity, direction, relationship type, source/target line, status, origin, evidence, confidence, creator, timestamp and version. Explicit live references are materialised idempotently. Changed source references cease to participate in the graph; their earlier relationship evidence remains stored. Reviewed decisions are not overwritten by refresh.

Confirmed relationships drive traversal. Imported related-ID candidates and unique serial matches require review before they expand lineage. Customer, supplier and product masters are endpoints when traversing another transaction, preventing one shared customer from pulling unrelated exports into a record. Equipment and projects remain traversable. Export readiness uses a narrower scope that excludes other invoices and shared procurement, so another export cannot satisfy missing evidence.

The shared record page provides business information, transactions, finance, procurement, logistics, documents, communication, tasks, timeline, 360° connections, audit and source/migration tabs. Existing document actions retain their established editor, conversions, approvals, posting/reversal and download controls. Import locks continue to protect historical accounting records.

The Data Dictionary page derives operational fields, required flags, reference targets, validation descriptions, document categories and transitions from the existing module catalogue. Transaction-specific sales validation remains in the sales engine. It is not a claim that every optional legacy JSON field is a required form field.

## Point-by-point delivery

| Document point | Implementation / boundary |
|---|---|
| 1 | Shared relationships connect existing registers; they no longer rely solely on local screen links. |
| 2 | Existing business references and data are retained. Illustrative amounts and statuses from the proposal are not inserted. |
| 3 | Earlier Related links are upgraded to evidence-bearing relationships. |
| 4 | One 360° route supports every accessible record, including masters, equipment, orders, invoices, shipments, payments, advances, projects and eBRC. |
| 5 | Customer overview, financial balances, FY sales/purchases, timeline, documents, communication and connected transactions. |
| 6 | Supplier profile, procurement, equipment, downstream sales/export, payments and ledger navigation. Unknown warehouse locations remain unknown. |
| 7 | Procurement → equipment → export lineage, plus audited direct relationship references. Procurement is not evidence of remittance. |
| 8 | eBRC uses the shared export, remittance/finance, procurement, documents and audit view. Numbers must be supplied from bank evidence. |
| 9 | Clickable directed graph lists typed connections and evidence. |
| 10 | Shared Related Records component throughout the record workspace. |
| 11 | Timeline uses actual transaction, payment, receipt, EGM and shipment dates; expected dates are labelled as expected. |
| 12 | Pending checks inspect recorded evidence and allocated receipt coverage. |
| 13 | Next-action suggestions create linked tasks only after an owner and due date are supplied. No deadlines are fabricated. |
| 14 | Existing functional work areas are retained, with Control Tower and direct remittance/forex work areas. Prior user preference to omit sidebar subheadings is preserved. |
| 15 | Functional navigation and entity relationships are independent. |
| 16 | Global search covers accessible business fields, serials, bank references, shipping/container references and all financial years; results open the precise record. |
| 17 | Business overview is the primary imported-record view. Raw cells are under Source & Migration. |
| 18 | Existing original workbook, batch, sheet, row, cell, formula and cached value traceability remains intact. Relationships carry additional evidence and confidence. |
| 19 | Confirmed, Derived and Rejected relationships are distinguished. Review requires a reason and checks the relationship version. |
| 20 | Invoice/receipt reconciliation appears in Finance; the existing workbook reconciliation and source-exception workspace remains linked from Control Tower. |
| 21 | Posted journal records link through their source record. Historical source data is not silently posted. |
| 22 | Receipts connect to customer, invoice, export evidence and journal where recorded. Unallocated receipts are flagged. |
| 23 | Remittance and Forex forms validate invoice/receipt consistency. Forex stores a versioned calculation with inputs, cash realisation, separate bank fees and FX gain/loss. |
| 24 | eBRC readiness displays missing core evidence, partial payment coverage and document checks. It does not certify bank/government eligibility. |
| 25 | Document control lists recorded export documents, missing categories and downloadable supporting files. |
| 26 | Common document presentation retains category, identity, party, status, date, amount/currency, source links, version and audit. Existing attachments are reused. |
| 27 | Existing catalogue-driven forms and richer shared sales form remain the editing frameworks. New banking forms use the same catalogue and validation pipeline. |
| 28 | Shared record anatomy: header, status, actions, financial summary, lifecycle, business detail, relationships, documents, tasks, timeline and audit. |
| 29 | Transaction detail uses the common workspace with a contextual next-action and financial sidebar. |
| 30 | 360° is available from records and search; no separate customer-only 360 menu is required. |
| 31 | Persistent tenant-scoped relationship table and index. |
| 32 | Flexible cross-module edges supplement existing accounting references. |
| 33 | Supported relationship-type vocabulary is available when adding a link. |
| 34 | Explicit line/product references and unique serial candidates retain source line numbers; manual links can specify both line identities. |
| 35 | Linked procurement, expenses, receipts, charges and incentives are inspectable. A versioned contribution rule is available. Shared or missing costs are not automatically allocated; IGST recovery is excluded from contribution income. |
| 36 | Versioned FX, tax, incentive and contribution rules retain inputs/results in calculation runs and audit. Existing sales pricing remains in its existing validated engine. |
| 37 | Source cells, recognised records and saved derived calculations remain separate. |
| 38 | Migration coverage/source issues remain in the workbook centre; relationship confirmed/derived/rejected counts appear in Control Tower. |
| 39 | Clickable exception groups include missing export evidence, pending incentives, unallocated payments and procurement allocations. |
| 40 | Dashboard shows actionable control-tower counts and transaction links. |
| 41 | Forward/backward navigation answers procurement-to-export and eBRC-to-procurement questions when evidence exists. |
| 42 | Work areas, graph, timeline, audit and control tower share records and tenant permissions. |
| 43 | Lifecycle checks span invoice, shipping, BL, shipment, payment, bank realisation, forex, documents, eBRC and incentives; existing enquiry/quotation/order conversion workflows remain intact. Missing historical stages are not invented. |
| 44 | Shared schema, catalogue dictionary, relationships, UI, rules, workflows, audit snapshots and migration layer are implemented/reused. |
| 45 | Foundation is added beneath existing pages; no unrelated quotation redesign is substituted for this work. |
| 46 | Existing purchase/sales/export/finance/incentive capabilities are connected in the proposed business order. |
| 47 | Original workbook archive, source drilldown and import posting locks remain. |
| 48 | Accessible records expose origin, successors, related documents, financial records, pending evidence, lifecycle and audit through the common framework. |

## Accounting and evidence boundaries

A relationship does not allocate money. Financial reconciliation uses explicit invoice/receipt or invoice/payment allocations, separates currencies, and excludes cancelled/reversed records. A partial receipt cannot mark customer payment complete. IGST refunds are tax recovery rather than revenue. Missing opening balances, ambiguous expenses and shared costs still require business reconciliation. The ERP does not invent an eBRC, realisation reference, warehouse, cost split, deadline or tax applicability.

Record updates now preserve the earlier JSON and version in `record_versions` using a database trigger. Versions are immutable; audit entries retain actors and reasons. Source evidence remains unchanged. The version trigger covers future updates, not an invented reconstruction of edits made before this release.

## Validation

Synthetic integration checks cover existing workflows plus supplier-to-equipment-to-export/eBRC traversal, confidence review, stale decisions, restricted search/graph access, partial settlement, linked task creation, versioned calculations and immutable prior versions. The local imported supplier example is checked independently against the read-only record snapshot. Production compilation and exact localhost availability are checked before handoff. No authenticated browser visual test is claimed.
