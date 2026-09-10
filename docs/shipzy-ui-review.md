# Simpler ERP workspace — reference review

Reviewed all 47 supplied screenshots and all populated rows and columns in the image-wise specification workbook. The workbook's implementation prompts are reference proposals, not separate user instructions. This change applies the requested simpler interaction model to the existing ERP; it does not represent completion of every proposed Shipzy integration or acceptance test.

## Implemented

- Eleven main navigation entries, without sidebar category subheadings; searchable All tools preserves access to the larger module collection.
- One operational dashboard replaces four stacked overview components. Existing shared records supply the screen, avoiding duplicate overview requests.
- Customer and supplier invoice balances use one selected currency, searchable lists, paid/part-paid/unpaid views, matching filtered totals and CSV export. Dashboard drill-through retains the date range and currency.
- Documents start with invoice folders. Files and photos have separate views, search and pagination; existing authenticated download and upload APIs remain in use.
- Shared record pages expose Details, Documents, Payments and Activity first. Other sections remain under More; shipment evidence, additional fields, related records, export readiness and calculation history expand on demand.
- Searchable report and settings catalogues; shorter sales editor section labels; shared responsive list, metric and catalogue styles.

## Architecture

`lib/workspace-navigation.ts` defines the daily navigation and applies existing operation permissions. `components/simple-workspace.tsx` holds the small workspace views. Existing operation definitions, financial calculation engine, record detail component, API authorization, audit history, routes and database remain authoritative. No data migration or re-import is required. Original source data is not rewritten.

## Reference-by-reference findings

The following records each reference's subject and proposed UX direction. These are review findings, not a claim that every proposed capability was implemented.

| Image | Area / screen | Reference UX direction |
|---|---|---|
| 1 | Dashboard — Receivables and product-wise sales dashboard | Use configurable KPI cards, an exception-first receivables table, a properly labelled product chart, visible period/currency selectors, drill-through links, loading and empty states. |
| 2 | Dashboard / Alerts — Start-of-day operational alerts | Replace the blocking modal with an alert center grouped by severity and type; include record link, owner, due time, dismiss/snooze and mark-resolved actions. |
| 3 | Dashboard / Orders — Running order status cards | Provide a compact pipeline/table toggle with stage stepper, exception badge, owner, next action and due date; retain summary KPIs below. |
| 4 | Administration — Expanded master-settings navigation | Group settings into Company and Documents, Product and Packaging, Trade Partners, Terms and Templates, Compliance, Logistics, Integrations and User Management; add settings search. |
| 5 | Master Data / Company — Company profile and branding | Split into Legal Identity, Contact, Addresses, Statutory IDs, Branding and Document Defaults; add image preview, file guidance and save-state feedback. |
| 6 | Master Data / Products — Product CSV import | Implement a five-step import wizard: download template, upload, map columns, validate/preview and commit; show progress and downloadable errors. |
| 7 | Master Data / Products — Product basic-details editor | Use a structured responsive form with Basic, Commercial, Packaging, Schemes and Compliance sections; add sticky save bar and clear unsaved-change state. |
| 8 | Master Data / Products — Product master list | Add sticky header, saved filters, column chooser, density control, status chips, bulk activate/deactivate/export and a row detail drawer. |
| 9 | Master Data / Products — Product export-scheme details | Use an editable scheme grid with scheme lookup, unit, rate, cap, currency if applicable, effective dates and validation summary. |
| 10 | Master Data / Products — Product advanced commercial details | Group Measurement, Weight and Pricing fields; show units beside values, calculated volume preview and contextual help. |
| 11 | Sales / Quotations — Create quotation overview | Replace with a full-page guided workflow: Basic, Parties, Route, Commercial Terms, Products, Documents and Review; autosave drafts and show completion status. |
| 12 | Master Data / Parties — Customer, consignee and buyer master list | Use one party list with role chips, primary contact/address, risk indicator, status and a detail drawer; add duplicate warning during create. |
| 13 | Sales / Quotations — Quotation consignee and route details | Provide searchable party/address selectors, route stepper, dependent country-port inputs and quick-add drawers. |
| 14 | Sales / Quotations — Quotation commercial and shipment terms | Group Commercial, Banking and Fulfilment terms; show default source, exchange-rate date and editable override indicator. |
| 15 | Sales / Quotations — Quotation products and required documents | Use a keyboard-friendly line grid with totals and a document recommendation panel that shows requirement source and allows authorized additions/removals. |
| 16 | Export Operations / Checklist — Export-document checklist matrix | Retain compact matrix as an optional view but add labelled statuses, tooltips, sticky identifiers, filters and a detailed checklist view with owner/due date/actions. |
| 17 | Sales / Proforma Invoices — Proforma invoice and contract list | Use a standard list with saved status filters, status chips, approval state, amount/currency, document version and clear row actions. |
| 18 | Documents / Preview — Generated export contract PDF preview | Embed a document viewer with page thumbnails, zoom, file/version metadata, approval banner, download and activity panel. |
| 19 | Administration / Email — Webmail sender configuration | Create a guided connection form with provider presets, masked secrets, test connection, domain/sender verification state and troubleshooting messages. |
| 20 | Export Operations / Pre-shipment — Pre-shipment drive and create-document menu | Replace long dropdown with searchable grouped command menu showing Recommended, Required, Optional and Already Created states. |
| 21 | Export Operations / Pre-shipment — Pre-shipment document-type selector | Group types into Invoice/Packing, Shipping Instructions, Declarations, Quality/Inspection and Certificates; add search, description and prerequisite badges. |
| 22 | Administration / Templates — Export-document template editor | Use a full-page editor with merge-field browser, controlled styles, header/footer, page breaks, real-data preview and draft/published version status. |
| 23 | Administration / Templates — Document template category selector | Separate business category, document type, locale and applicable workflow; show description and inherited defaults. |
| 24 | Administration / Templates — Document template master list | Add type, category, version, locale, published state, effective date, owner, last used and actions for preview/copy/new version/archive. |
| 25 | Administration / Templates — Document template list pagination and status | Add server-side search, category/type/status filters, page-size control, result count and saved views. |
| 26 | Export Operations / Documents — Pre-shipment documents for one invoice | Use labelled actions and columns for version, requirement, owner, approval, generated by/date and latest job status. |
| 27 | Export Operations / Post-shipment — Shipment document creation menu | Use workflow-stage tabs and a searchable document catalog with Required, Ready, Missing Data and Completed indicators. |
| 28 | Shipzy Drive — Proforma-invoice document tab empty state | Provide an instructive empty state with eligibility explanation and primary actions to generate, upload or open the related PI. |
| 29 | Shipzy Drive / Documents — Invoice document repository | Add metadata columns, document/photo tabs, search/filter, preview drawer, upload progress and grouped document-type chips. |
| 30 | Shipzy Drive / Documents — Bulk merge-PDF and send-email actions | Show selection tray with file count, reorder control, compatibility warnings, combined size and explicit Merge PDF / Send Email buttons. |
| 31 | Invoices — Invoice list and document actions | Group actions into Open, Generate, Preview, Download by format and Send; show latest version/status beside each document. |
| 32 | Invoices / Documents — Commercial invoice PDF preview | Embed preview in the invoice workspace with metadata, approval status, source-data link, thumbnails, zoom and version switcher. |
| 33 | Purchase / Goods Receipt — Purchase-order receipt selection | Use searchable PO selector with vendor, ordered/received balance and status; group receipt header fields and show posting state. |
| 34 | Purchase / Goods Receipt — Purchase receipt product details | Use a line grid showing ordered, previously received, remaining, received, rejected, unit, package, lot/batch and weighbridge reference. |
| 35 | Finance / Receivables — Inward-payment list | Provide KPI summary, status chips, customer/currency/date filters, balance column, allocation drill-down and standard table controls. |
| 36 | Finance / Receivables — Inward-payment entry | Use a full-width form with Receipt Details, Invoice Allocations, Bank/Remittance, Deductions and eBRC sections plus a reconciliation summary. |
| 37 | Communications — Invoice email composer | Add To/CC/BCC/Reply-To, template preview, attachment list with version/size, save draft, send confirmation and delivery-status feedback. |
| 38 | Finance / eBRC — Pending eBRC status list | Show readiness/status chip, last checked, external reference, error summary and controlled bulk refresh; add date and status filters. |
| 39 | Finance / eBRC — eBRC remittance and deduction details | Group Shipping Bill, Remittance, Invoice Allocation, Deductions and Freight/Insurance; show formula summary and missing-required-field panel. |
| 40 | Shipment Tracking — Container milestone timeline and route map | Show unified milestone timeline and map with estimated/actual labels, source, last refresh, stale-data warning and exception banner. |
| 41 | Administration / Integrations — Zapier integration connection | Display connection status, account, granted scopes, last successful event, failures, reconnect and revoke actions. |
| 42 | Reports / Finance — Payment report table | Add sticky filters, currency labels, status chips, sortable columns, drill-through, export and as-of timestamp. |
| 43 | Reports / Finance — Payment report filters and KPI summary | Use an expandable filter bar with applied chips, date/customer/currency/status controls and KPI cards labelled with currency and as-of time. |
| 44 | Reports — Reports catalog | Add catalog search, domain filters, favorites, recent reports, short descriptions and permission-aware disabled states. |
| 45 | Reports / Audit — Document activity timeline | Provide filters for actor, entity, event, date and correlation ID; show grouped timeline with expandable metadata and change summary. |
| 46 | Administration — Grouped master-settings catalog | Retain grouped catalog, add settings search, role-based visibility, setup progress, warnings for incomplete required masters and recent items. |
| 47 | Administration — Master-settings catalog close-up | Use one canonical responsive catalog with compact/comfortable density, anchored domain sections and persistent search. |

## Boundaries

External email delivery, mailbox OAuth, Zapier, DGFT/eBRC provider submission, PDF merging, advanced template versioning and new statutory rate-history workflows are not introduced by this UI change. Existing recorded evidence must not be presented as external submission or certification. The workbook lists these as additional capabilities requiring their own implementation and credentials.

Verification: TypeScript check and production build passed; all 136 integration checks passed against a disposable database. Localhost returned HTTP 200 and the local service is active. Browser visual testing was not performed in this pass.
