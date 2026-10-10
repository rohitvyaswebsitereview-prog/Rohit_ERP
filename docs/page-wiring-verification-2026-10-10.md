# ERP page and control verification — 10 October 2026

Review: http://127.0.0.1:3000/ (on this computer).

The reported company Save failure and missing dashboard business figures have been repaired and rechecked. Additional confirmed faults were repaired during the review. This report separates a page opening correctly from a complete business workflow passing; it does not certify every possible action, record combination or external service.

## Repairs and checks

| Area | Problem found | Change made | Verification and result |
|---|---|---|---|
| Company creation | Save did not submit the form, so clicking it produced no response. | Connected Save to the existing validation and save process. | Browser: blank submission shows the required-name message. In a separate copy of the database, created a company with contact, address and document defaults; reloaded and confirmed it remained saved. Passed. |
| Company editing | Shared Save control also affected editing. | The same submit repair applies to editing. | Browser: changed the test company's trading name with a reason, saved and reloaded; version increased and the value remained. Passed. |
| Cancel | Cancel left the outer creation page open. | Return to the register after cancelling creation, or to the existing record after cancelling editing. | Failing regression reproduced first; actual create/edit handlers now pass. Live browser confirms creation Cancel returns to the company register. |
| Other form buttons | Several shared buttons looked like Save or Upload but did not submit. | Explicit submission for record review, relationships, calculations, linked tasks, documents and password forms; explicit Search submission. | Structural check covers all 13 application forms. Company and document workflows were also exercised in the browser. Other actions have automated coverage rather than individual browser submission. |
| Dashboard figures | Imported history existed, but posted accounts were empty; the dashboard made the business look empty. | Show recorded invoice, purchase, expense, receipt and payment values separately from posted account balances, in their original currencies. | Automated checks cover dates, statuses, currency and invalid/missing amounts. Live browser shows figures and record counts. No accounting entries were invented. |
| Dashboard breakdown | Figures needed a reliable route to the records behind them. | Each recorded total opens a report with the same period, currency and category. | Actual handler/render tests plus live USD sales click show the matching total and 70 records. Passed. |
| Dashboard period | A period with no records must remain understandable. | Clear no-eligible-records message and no-posted-balances explanation. Hide the accounting currency selector when there are no posted balances. | Live This Month shows no eligible records; returning to This Financial Year restores recorded values. Automated currency-control check passes. |
| Reports menu | Most implemented report links were missing because navigation was built before report registration. | Shared report registry is available before the menu is created. | Initialization regression tests pass. Live Reports menu now exposes Sales, Purchase, Inventory, Finance, Export, Logistics, Compliance, Costing, Custom and Trial Balance. |
| Password menu | Change Password did not open the working form. | Open the actual password form and use the existing password service, with inline failure feedback. | Browser confirms dialog and required fields; automated tests check submitted fields, success and failure. No live password was changed. |
| Incentive reports | Scheme links could show unrelated schemes. | Apply the selected DBK, RoDTEP or IGST refund scheme. | Actual rendered filter checks pass. |
| Document reports | Year, transaction family and generated/uploaded distinctions were incomplete. | Scope linked documents to transaction year and family; distinguish generated and uploaded files; explain excluded links and shared master files. | Automated scope checks pass. All document destinations open. |
| Document drive | Changing year or page could leave the user on a stale page number. | Reset page position when the route/year changes. | Actual state-handler regression passes. |
| Document upload | Upload did not submit. | Connect Upload to submission. | Browser uploaded a harmless text file in the separate database and displayed its file entry and download link. Passed. |
| File download | Needed evidence beyond a visible link. | Existing download service retained. | Automated service test verifies original file bytes and download headers. Browser download capture was not confirmed; it is not marked as a browser pass. |
| Stock overview | Missing movement history could look like a definite zero, and quantity rules needed clarification. | Sum eligible receipts/issues through the selected date; show Not recorded where no history exists. | Automated quantity, status and missing-history checks pass. Both stock pages open. |
| Financial access | New totals and reports must respect the restricted Logistics role. | Remove financial aggregates from that role and deny the financial breakdown screen. | Automated role checks pass. |

## Verification summary

| Check | Result | What this establishes |
|---|---|---|
| Menu, master and report destinations | 158 of 158 opened with visible content and no page alerts | Page availability only; individual actions are covered as described above. |
| Automated suites | 26 passed, 0 failed | Includes the existing 166-check integration suite, finance, stock, purchases, production, access, layout, PDF and new wiring regressions. |
| Application consistency check | Passed | No type errors in the final source. |
| Production build | Passed | The final application was built successfully. |
| Local service | Restarted with final build; dashboard and original company symptoms rechecked | The review link serves the corrected version. |
| Backup | Local snapshot verified and restored to a separate test location | Existing business data was protected before browser write tests. This is not an off-device backup. |
| Business data | Live footer remains 1,651 records | Test company and test file were created only in the separate test database. |
| Independent source review | One missing-amount validation defect found and fixed | Its failing regression now passes; dashboard click-through coverage was also added. |

## Every page checked

Every row below means: the destination opened, displayed non-empty main content and had no visible page alert after loading. An empty business register with an appropriate message counts as a working page. These rows do **not** claim that every button or destructive/financial action was clicked. Company, dashboard, upload and password checks are described separately above. Checks used a private local database copy; the final live dashboard and company form were rechecked after restart.

| No. | Page | Address | Page check |
|---|---|---|---|
| 1 | Sales & Export | /sales | Opens; content visible; no page alerts |
| 2 | Proforma Invoices | /proformas | Opens; content visible; no page alerts |
| 3 | Sales Orders | /sales-orders | Opens; content visible; no page alerts |
| 4 | Commercial Invoices | /invoices | Opens; content visible; no page alerts |
| 5 | Domestic Sales | /domestic-invoices | Opens; content visible; no page alerts |
| 6 | Bills of Lading | /bills-of-lading | Opens; content visible; no page alerts |
| 7 | Export Shipments | /shipments | Opens; content visible; no page alerts |
| 8 | Customer Accounts | /customers | Opens; content visible; no page alerts |
| 9 | Enquiries | /sales-enquiries | Opens; content visible; no page alerts |
| 10 | Purchase | /purchase | Opens; content visible; no page alerts |
| 11 | Purchase Orders | /purchase-orders | Opens; content visible; no page alerts |
| 12 | Supplier Advances | /supplier-advances | Opens; content visible; no page alerts |
| 13 | Purchase Invoices | /purchase-invoices | Opens; content visible; no page alerts |
| 14 | Purchase Returns | /purchase-returns | Opens; content visible; no page alerts |
| 15 | Purchase Expenses | /expenses | Opens; content visible; no page alerts |
| 16 | Expense Bills | /bills | Opens; content visible; no page alerts |
| 17 | Vendors | /vendors | Opens; content visible; no page alerts |
| 18 | Import | /import | Opens; content visible; no page alerts |
| 19 | Import Orders | /import-orders | Opens; content visible; no page alerts |
| 20 | Bill of Entry | /bill-of-entry | Opens; content visible; no page alerts |
| 21 | Customs | /customs | Opens; content visible; no page alerts |
| 22 | Import Costs | /import-costs | Opens; content visible; no page alerts |
| 23 | Import Settlement | /import-settlements | Opens; content visible; no page alerts |
| 24 | Inventory | /inventory | Opens; content visible; no page alerts |
| 25 | Serialized Stock | /machines | Opens; content visible; no page alerts |
| 26 | Stock Movements | /movements | Opens; content visible; no page alerts |
| 27 | Stock Transfer | /stock-transfers | Opens; content visible; no page alerts |
| 28 | Stock Adjustment | /stock-adjustments | Opens; content visible; no page alerts |
| 29 | Products | /products | Opens; content visible; no page alerts |
| 30 | Warehouses | /warehouses | Opens; content visible; no page alerts |
| 31 | Logistics | /logistics | Opens; content visible; no page alerts |
| 32 | Transport | /transport | Opens; content visible; no page alerts |
| 33 | Pickup / Delivery | /delivery-challans | Opens; content visible; no page alerts |
| 34 | Shipping Line | /master-shipping-lines | Opens; content visible; no page alerts |
| 35 | Logistics Charges | /master-shipping-line-charges | Opens; content visible; no page alerts |
| 36 | Shipment Overview | /orders | Opens; content visible; no page alerts |
| 37 | Production | /production | Opens; content visible; no page alerts |
| 38 | Production Orders | /production-orders | Opens; content visible; no page alerts |
| 39 | BOM | /master-bom | Opens; content visible; no page alerts |
| 40 | Material Consumption | /material-consumption | Opens; content visible; no page alerts |
| 41 | Production Output | /production-output | Opens; content visible; no page alerts |
| 42 | Finance | /finance | Opens; content visible; no page alerts |
| 43 | Receivables | /receivables | Opens; content visible; no page alerts |
| 44 | Receipts | /receipts | Opens; content visible; no page alerts |
| 45 | Cash & Bank | /cash | Opens; content visible; no page alerts |
| 46 | Remittance & Forex | /remittances | Opens; content visible; no page alerts |
| 47 | eBRC | /ebrc | Opens; content visible; no page alerts |
| 48 | General Ledger | /journal | Opens; content visible; no page alerts |
| 49 | Chart of Accounts | /accounts | Opens; content visible; no page alerts |
| 50 | Approval Requests | /approvals | Opens; content visible; no page alerts |
| 51 | Customer Advance Adjustments | /customer-advance-adjustments | Opens; content visible; no page alerts |
| 52 | Supplier Advance Adjustments | /supplier-advance-adjustments | Opens; content visible; no page alerts |
| 53 | Customer Advance Refunds | /customer-advance-refunds | Opens; content visible; no page alerts |
| 54 | Supplier Advance Refunds | /supplier-advance-refunds | Opens; content visible; no page alerts |
| 55 | Forex Realisations | /forex | Opens; content visible; no page alerts |
| 56 | Compliance | /compliance | Opens; content visible; no page alerts |
| 57 | E-Invoice | /einvoices | Opens; content visible; no page alerts |
| 58 | E-Way Bill | /eway-bills | Opens; content visible; no page alerts |
| 59 | LUT Watch | /lut-register | Opens; content visible; no page alerts |
| 60 | Exception Register | /exceptions | Opens; content visible; no page alerts |
| 61 | Document Templates | /master-document-templates | Opens; content visible; no page alerts |
| 62 | Tasks & Checklist | /tasks | Opens; content visible; no page alerts |
| 63 | Checklist | /checklists | Opens; content visible; no page alerts |
| 64 | Task Templates | /task-templates | Opens; content visible; no page alerts |
| 65 | Costing & Profitability | /costing | Opens; content visible; no page alerts |
| 66 | Profitability | /profitability | Opens; content visible; no page alerts |
| 67 | Reports | /reports | Opens; content visible; no page alerts |
| 68 | Sales Report | /sales-report | Opens; content visible; no page alerts |
| 69 | Trial Balance | /trial-balance | Opens; content visible; no page alerts |
| 70 | Masters | /masters | Opens; content visible; no page alerts |
| 71 | Administration | /administration | Opens; content visible; no page alerts |
| 72 | Users & Roles | /users | Opens; content visible; no page alerts |
| 73 | User Groups | /user-groups | Opens; content visible; no page alerts |
| 74 | Approval Workflows | /approval-rules | Opens; content visible; no page alerts |
| 75 | System Activity | /activity | Opens; content visible; no page alerts |
| 76 | Settings | /settings | Opens; content visible; no page alerts |
| 77 | Tax Codes | /tax-codes | Opens; content visible; no page alerts |
| 78 | Price Lists | /price-lists | Opens; content visible; no page alerts |
| 79 | Standard Clauses | /standard-clauses | Opens; content visible; no page alerts |
| 80 | Business Data & Reconciliation | /workbook-data | Opens; content visible; no page alerts |
| 81 | Data Dictionary & Rules | /data-dictionary | Opens; content visible; no page alerts |
| 82 | Help & Support | /help | Opens; content visible; no page alerts |
| 83 | Company Information | /master-company-information | Opens; content visible; no page alerts |
| 84 | Units | /master-units | Opens; content visible; no page alerts |
| 85 | Packages | /master-packages | Opens; content visible; no page alerts |
| 86 | Package Types | /master-package-types | Opens; content visible; no page alerts |
| 87 | Packaging Materials | /master-packaging-materials | Opens; content visible; no page alerts |
| 88 | Quality Specifications | /master-quality-specifications | Opens; content visible; no page alerts |
| 89 | Delivery Addresses | /master-delivery-addresses | Opens; content visible; no page alerts |
| 90 | Ports | /master-ports | Opens; content visible; no page alerts |
| 91 | Payment Terms | /master-payment-terms | Opens; content visible; no page alerts |
| 92 | Shipment Terms | /master-shipment-terms | Opens; content visible; no page alerts |
| 93 | Currency | /master-currency | Opens; content visible; no page alerts |
| 94 | Bank Details | /master-bank-details | Opens; content visible; no page alerts |
| 95 | Advance Licence | /master-advance-licence | Opens; content visible; no page alerts |
| 96 | EPCG Licence | /master-epcg-licence | Opens; content visible; no page alerts |
| 97 | LC Master | /master-lc-master | Opens; content visible; no page alerts |
| 98 | Destination Charges | /master-destination-charges | Opens; content visible; no page alerts |
| 99 | Additional Charges | /master-additional-charges | Opens; content visible; no page alerts |
| 100 | Email Templates | /master-email-templates | Opens; content visible; no page alerts |
| 101 | Order Status | /master-order-status | Opens; content visible; no page alerts |
| 102 | Quotations | /quotations | Opens; content visible; no page alerts |
| 103 | Customer Advances | /customer-advances | Opens; content visible; no page alerts |
| 104 | Shipping Bills | /shipping-bills | Opens; content visible; no page alerts |
| 105 | Projects | /sales-projects | Opens; content visible; no page alerts |
| 106 | Stock Overview | /stock | Opens; content visible; no page alerts |
| 107 | Freight | /freight | Opens; content visible; no page alerts |
| 108 | Payables | /payables | Opens; content visible; no page alerts |
| 109 | Payments | /payments | Opens; content visible; no page alerts |
| 110 | Export Incentives | /incentives | Opens; content visible; no page alerts |
| 111 | Documents | /documents | Opens; content visible; no page alerts |
| 112 | Costing Sheets | /costing-sheets | Opens; content visible; no page alerts |
| 113 | Audit Log | /audit | Opens; content visible; no page alerts |
| 114 | Expense Types | /master-expense-types | Opens; content visible; no page alerts |
| 115 | Pending Tasks | /tasks-pending-tasks | Opens; content visible; no page alerts |
| 116 | Completed Tasks | /tasks-completed | Opens; content visible; no page alerts |
| 117 | Generated Documents | /documents-generated-documents | Opens; content visible; no page alerts |
| 118 | Transaction Documents | /documents-transaction-documents | Opens; content visible; no page alerts |
| 119 | Export Documents | /documents-export-documents | Opens; content visible; no page alerts |
| 120 | Domestic Documents | /documents-domestic-documents | Opens; content visible; no page alerts |
| 121 | Uploaded Documents | /documents-uploaded-documents | Opens; content visible; no page alerts |
| 122 | Document Drive | /documents-drive | Opens; content visible; no page alerts |
| 123 | Stock Register | /inventory-stock-register | Opens; content visible; no page alerts |
| 124 | Stock Ageing | /inventory-stock-ageing | Opens; content visible; no page alerts |
| 125 | Location Stock | /inventory-yard-location-stock | Opens; content visible; no page alerts |
| 126 | Inventory Valuation | /inventory-inventory-valuation | Opens; content visible; no page alerts |
| 127 | Inventory Reports | /inventory-inventory-reports | Opens; content visible; no page alerts |
| 128 | Shipment Tracking | /logistics-shipment-tracking | Opens; content visible; no page alerts |
| 129 | Remittance & Forex | /finance-remittance-forex | Opens; content visible; no page alerts |
| 130 | Financial Reports | /finance-financial-reports | Opens; content visible; no page alerts |
| 131 | Tax Working Register | /finance-tax | Opens; content visible; no page alerts |
| 132 | Compliance Overview | /compliance-compliance-overview | Opens; content visible; no page alerts |
| 133 | LEO Watch | /compliance-leo-watch | Opens; content visible; no page alerts |
| 134 | FEMA Realisation | /compliance-fema-realisation | Opens; content visible; no page alerts |
| 135 | Pending eBRC | /compliance-pending-ebrc | Opens; content visible; no page alerts |
| 136 | eBRC Reconciliation | /compliance-ebrc-mismatch | Opens; content visible; no page alerts |
| 137 | TDS Register | /compliance-tds | Opens; content visible; no page alerts |
| 138 | Compliance Reports | /compliance-compliance-reports | Opens; content visible; no page alerts |
| 139 | Purchase Reports | /reports-purchase-reports | Opens; content visible; no page alerts |
| 140 | Inventory Reports | /reports-inventory-reports | Opens; content visible; no page alerts |
| 141 | Finance Reports | /reports-finance-reports | Opens; content visible; no page alerts |
| 142 | Export Reports | /reports-export-reports | Opens; content visible; no page alerts |
| 143 | Logistics Reports | /reports-logistics-reports | Opens; content visible; no page alerts |
| 144 | Compliance Reports | /reports-compliance-reports | Opens; content visible; no page alerts |
| 145 | Costing Reports | /reports-costing-reports | Opens; content visible; no page alerts |
| 146 | Custom Report | /reports-custom-reports | Opens; content visible; no page alerts |
| 147 | Shipment Costing | /costing-shipment-costing | Opens; content visible; no page alerts |
| 148 | Product Costing | /costing-product-costing | Opens; content visible; no page alerts |
| 149 | Order Profitability | /costing-order-profitability | Opens; content visible; no page alerts |
| 150 | Margin Analysis | /costing-margin-analysis | Opens; content visible; no page alerts |
| 151 | Production Planning | /production-production-planning | Opens; content visible; no page alerts |
| 152 | Production Reports | /production-production-reports | Opens; content visible; no page alerts |
| 153 | Import Documents | /import-import-documents | Opens; content visible; no page alerts |
| 154 | Import Shipments | /import-import-shipments | Opens; content visible; no page alerts |
| 155 | Permissions | /administration-permissions | Opens; content visible; no page alerts |
| 156 | Login & Security | /administration-login-security | Opens; content visible; no page alerts |
| 157 | Company Addresses | /master-company-addresses | Opens; content visible; no page alerts |
| 158 | Export Documents | /sales-export-documents | Opens; content visible; no page alerts |

## Remaining limits and business decisions

The wiring repairs do not resolve all previously recorded ERP business limitations. See [the existing acceptance audit](audit-acceptance-2026-10-10.md) for the full register.

| Area | Still needed |
|---|---|
| Opening accounts and historical stock | Review and approve opening balances and stock values before relying on official accounts or stock valuation. Imported history remains preserved. |
| Profit and currency conversion | Agree common-currency conversion rules and shared-cost allocation before treating every margin report as final profit. |
| Tax and external connections | Statutory working reports are not filing certification. Bank, shipping and government services are not all connected. |
| Purchase returns | Complete the remaining accounting treatment recorded in the earlier audit. |
| Business continuity and scale | Configure off-device backup; rehearse full recovery and account security; complete staff acceptance checks and large-volume UI testing. |
| Coverage boundary | Not every record-specific workflow, device, permission combination, download interaction or real-world financial action was browser-tested. The repaired symptoms and listed regression tests passed. |

## Automated suite register

| Suite | Final result |
|---|---|
| audit-access.mjs | Passed |
| audit-attention.mjs | Passed |
| audit-company-save.mjs | Passed |
| audit-dashboard-display.mjs | Passed |
| audit-dashboard-drilldown.mjs | Passed |
| audit-dashboard-records.mjs | Passed |
| audit-editor-cancel.mjs | Passed |
| audit-finance.mjs | Passed |
| audit-form-submissions.mjs | Passed |
| audit-operations.mjs | Passed |
| audit-physical-overview.mjs | Passed |
| audit-presentation.mjs | Passed |
| audit-production-recipe.mjs | Passed |
| audit-purchase.mjs | Passed |
| audit-record-page.mjs | Passed |
| audit-stock.mjs | Passed |
| document-drive-pagination.mjs | Passed |
| document-report-scope.mjs | Passed |
| integration.mjs | Passed |
| navigation-initialization.mjs | Passed |
| page-controls.mjs | Passed |
| pdf-pagination.mjs | Passed |
| record-summary.mjs | Passed |
| shipzy-layout.mjs | Passed |
| workflow.mjs | Passed |
| audit-backup.py | Passed |
