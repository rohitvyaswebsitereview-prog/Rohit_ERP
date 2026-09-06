# Implementation status and delivery phases

This release starts the ERP build and prioritises the uploaded login, dashboard and shell. “Implemented” means locally executable; it does not mean production-certified.

| Specification area | Current state | Remaining work |
|---|---|---|
| Login and administrator | Implemented: setup, sign-in, password toggle, remember me, expiry, logout, password change | Username aliases, email recovery, SSO, MFA |
| Organisations and roles | Tenant-scoped schema and four enforced roles | Organisation switching, configurable permission matrix, field rules |
| Sidebar and header | Final 17 domains, sections, 240/68 px collapse, 64 px header, search and FY | Additional submenus as module specifications arrive |
| Dashboard overview | Six metrics and source-register links; ledger authority | Settlement-aware invoice ageing, approved costing completion |
| Needs Attention | Manual exceptions, severity/deadline ordering, drill-down | Statutory rules and source-service integrations |
| Running Operations | Orders, stage count/name, progress, ETD/ETA, filters, six-card limit | Recovered detailed stage definitions and workflow automation |
| Sales and profitability | Posted sales/COGS trend and margin | Product contribution requires invoice lines and cost allocations |
| Money and working capital | Cash flow, ledger AR/AP/cash, currency positions, invoice-age buckets | Reconciliation, settlement allocation, FX rate basis |
| Recent activity | Append-only events with actor and time | Pagination, advanced audit search and retention policies |
| Customer/vendor/product/warehouse masters | Create, list, search, details, CSV export | Edit/archive with version history, validation expansion, import |
| Purchase orders and advances | Basic order register/status | Advances, goods-receipt matching, stock purchase invoicing, payments |
| Sales quotations/proforma/domestic invoices | Shared sales foundation only | Detailed fields, line items, tax/pricing, conversion workflows |
| Commercial invoices | Draft and ledger posting | Tax, lines, printing, credit notes, returns and settlement |
| Inventory | Atomic whole-unit physical receipts/issues, warehouse balances | Serial/batch stock, transfers, FIFO/weighted-average valuation, barcode |
| Finance | Fixed chart, balanced journals, basic trial balance and cash reports | Complete ledger reporting, opening carryforward policy, financial statements |
| Import and Production | Source-qualified scope pages | All transactional subworkflows and BOM implementation |
| Logistics and export documents | Order shipment overview and document links | Delivery challans, shipping bills, BL, shipping APIs and costs |
| E-Way Bill/eBRC/incentives | Manual exception categories only | Generation, validation, government integration and statutory rules |
| Tasks and checklist | Task entry and progress | Template engine, approvals, recurring tasks, assignment |
| Document Drive | HTTPS document references | Upload/storage/download permissions, templates and PDF generation |
| HR/payroll/projects | Roadmap only from the broad brief | Module specifications and all implementation |
| Notifications | Separate activity and exception notifications with per-user read state | Email/SMS, scheduled reminders and preferences |
| Reports and data exchange | Register CSV export, base financial reports | Validated CSV/Excel import, custom/scheduled reports and pagination |
| Enterprise operations | Local build/test pipeline | Containers, infrastructure, monitoring, performance/security audit, backups |

## Acceptance and subsequent phases

1. **Current platform and uploaded designs:** sign in, collapse navigation, select FY, search records, inspect all six dashboard sections, open source registers. Authentication failures must be generic. Financial endpoints must deny unauthorised roles. No example amount may appear as business data. Covered by type/build checks and server integration checks; browser UAT is still required.
2. **Finance and inventory completion:** approve the account model and settlement/valuation rules; implement explicit relational module tables, invoice lines, settlements, stock costing and serialisation. Accept only when ledger/subledger/stock reconcile and posting reversals, FX and rounding tests pass.
3. **Purchase and export sales:** reconstruct fields/actions/statuses from each module source. Implement PO → receipt → supplier invoice matching, quotation → PI → invoice, advances, returns, export document relationships and approvals. Test complete UAT transactions and concurrent updates.
4. **Compliance and documents:** define statutory rules with stakeholders and authoritative sources; connect sandbox providers and implement generated documents/upload storage. Test deadlines, retries, mismatches and permission boundaries. No production government submission without the user's integration setup.
5. **HR/payroll, production/import and optional projects:** clarify applicability and detailed records first, then implement modules independently with posting contracts and UAT scenarios.
6. **Reporting, integrations and hardening:** custom reports, validated import, event outbox, webhooks, SSO/MFA, observability, deployment, migration/rollback, load tests, security review, restore exercises and localisation. Set measurable SLA/RPO/RTO before claiming production readiness.

## UAT scenarios to perform in the local app

- Create a customer, draft invoice, post it, and verify sales/receivables plus its balanced ledger journal. Attempt a duplicate post and verify no duplicate journal.
- Create product/warehouse masters, receive five units, try issuing six, and verify rejection. Issue four and check one remains.
- Create an order with a chosen stage count, update progress, then filter Running Operations and open its detail from the dashboard.
- Create a critical exception and a later warning; confirm ordering, unread notification count, read acknowledgement and resolution behaviour.
- Switch financial years: master data stays available; registers and search change year; stock retains history; ledger snapshot balances include earlier posted history.
- Create Viewer and Logistics users, then verify read-only access and withheld financial data respectively.
