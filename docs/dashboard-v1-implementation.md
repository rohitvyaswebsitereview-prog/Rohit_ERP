# Dashboard V1 implementation — 29 September 2026

Reference: Dashboard.docx supplied from ERP modules/Fundamental Architecture. The final dashboard and final application shell sections take precedence over the document's earlier exploratory layouts.

## Implemented

- Seventeen domain menus in the specified order, grouped implemented destinations, direct Masters catalogue, System divider, 240/68 px sidebar, fixed Dashboard and System regions, scrolling central modules, collapsed flyouts and active markers.
- Header: page title, global search with Ctrl+K, global financial year, refresh timestamp, separate Activity and Notifications previews, Settings, profile identity and account actions.
- Six management sections: Business Overview, Needs Attention, Running Operations, Sales & Profitability, Money & Working Capital, Recent Activity.
- Fiscal period choices, validated custom dates, original currency selection, six KPI drilldowns, independent request errors/retries, empty states, contextual widget actions.
- Posted-ledger revenue, cost, margin and cash. Opening cash reconciles to closing cash less period receipts plus period payments.
- Product contribution uses posted invoice base amounts and matching posted stock issues in the same currency and quantity. Missing cost evidence is excluded, not estimated. Unallocated journals are explicitly excluded from product attribution.
- Receivable/payable ageing, priority invoice links, per-currency balances; posted invoice drilldowns preserve currency and as-of date, including balances carried from earlier years.
- Actual transaction lifecycle cards, six per page, stage progress, operational filters, search, source record links and connected shipment dates.
- Recorded exceptions plus evidenced shipment, payment, task and stock alerts, severity/date ordering, full alert expansion. Independent alert source failure does not hide successfully loaded alerts.
- Audit activity remains separate from attention/notifications. No transactional editing controls on the dashboard.

## Boundaries and remaining specification decisions

- Historical workbook imports are not posted journals. This implementation preserves that distinction and does not manufacture opening entries or repost imported transactions.
- Product contribution is the supported stock-cost allocation, not a fully allocated export margin including shared freight, overhead and unallocated adjustments.
- Manage Financial Years opens existing financial-year preferences. Creating, closing and reopening fiscal years is not implemented by this change.
- Search is ERP-wide. The document describes grouped search results as an eventual enhancement; the existing search results remain.
- Final compliance deadline rules, authoritative extended costing allocation, notification escalation rules, and a more granular role matrix are listed as open decisions in the source. Existing recorded exceptions and role permissions remain authoritative; no statutory deadline or permission is invented.
- These changes complete a substantial dashboard implementation, not the entire historical end-to-end ERP request.

## Validation

- TypeScript check and production build passed.
- 31 focused layout/data regression checks and 166 disposable-database integration checks passed.
- Browser checked against local application: six sections loaded, seventeen menu entries present, real operational rows visible, fixed sidebar regions and header visible.
- No business records were created or changed for validation.
