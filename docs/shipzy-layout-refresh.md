# Shipzy reference layout refresh — 22 September 2026

The current request prioritizes the supplied Shipzy screenshots' navigation and visual layout. The reference workbook's proposed new integrations remain separate from copying the interface style.

## Applied

- Compact charcoal sidebar and white search header, green active selection, blue action buttons, orange CSV export, tighter white tables and tab bars.
- Master Settings and Logistics Master now expand into canonical master routes, using the existing master registry. E-Invoice has a direct menu entry. Opening a child route expands its parent.
- Mobile navigation overlays the page, closes after navigation, and supports a dismissing backdrop.
- Master catalog defaults to compact grouped cards. Setup readiness remains available in a collapsed disclosure.
- Master lists have status tabs. Product sorting and measurement controls move into an expandable List options row; search and primary actions remain visible.
- Reports use grouped domain cards and compact report links, with search, favorites and recent filters preserved.
- Sales entry uses a full-width form with the summary below it. Shared forms, records, tables, catalogs and document pages inherit the updated spacing.
- Local service uses the installed Node 24 runtime and is enabled for future user sessions.

## Preserved

Business data, authentication, authorization, financial calculations, imports, documents and API contracts. No source-reference images or customer data are added to Git.

## Verification and limits

TypeScript, production build and layout route/permission/render checks are run before restart. HTTP checks verify localhost. Browser visual inspection requires a working attached preview; it was unavailable during this pass. This is not a claim of pixel-for-pixel parity or implementation of external email, carrier or government integrations pictured in the references.

## Invoice PDF table follow-up

Generated PDFs now render stored line descriptions, HSN, quantity, unit, unit rate and amount in a bordered table. Measurement snapshots stay with their line; saved sales totals follow the table. Table headings repeat on continuation pages. Company branding and signatory rendering are preserved.

Verification: the PDF test checks all 100 unique table rows, repeated headings and the final total over six pages, in addition to the existing 180-line pagination case. First and final pages were rendered and visually inspected. All 166 integration checks passed. This does not establish complete customs-document content or final parity with every reference document.

## Invoice action and preview follow-up

Invoice list and detail Action menus now open an Invoice PDFs window. It separates commercial and customs invoice snapshots, shows saved versions/status/date, embeds the authenticated PDF preview and provides download/open links. Creation permissions control generation; earlier Customer invoice files remain visible in commercial history. Generating another version preserves existing files. The print-page action is explicitly labelled as such.

TypeScript, production build and 25 layout/helper checks passed. The added helper test verifies record and type isolation, PDF MIME filtering, prior category compatibility and chronological version selection. Browser interaction verification remains unproven: the in-app preview timed out while attaching. The customs output still needs its complete reference-content audit; this window does not itself provide customs submission or approval.

## Company profile follow-up — 29 September 2026

Company records now have General, Branding, Document Defaults, Documents and Activity tabs. General groups identity, statutory IDs, contacts and addresses. Branding renders logo/header/signature images instead of raw data URLs and shows missing-image placeholders. Default signatory, prefixes and footer remain visible in Document Defaults. Generic record text excludes image fields.

Live browser verification found that creation selected a nonexistent Basic tab for company fields. The editor now selects its first configured field section. After rebuilding and restarting, the browser confirmed Legal Identity selected and legal/trading name inputs visible. Branding controls for all three images were also inspected. No company record exists in the local database, so saved-image visual verification used component tests rather than invented business data. TypeScript, production build and 26 layout checks passed. The broader Shipzy review remains open.

## Dashboard alert follow-up

The start-of-day panel now computes alerts independently of receivables search/currency filters. It includes overdue posted or imported invoice balances, shipment confirmations and open overdue tasks, grouped into category tabs with counts. Currency labels remain on each balance, and draft invoices, completed tasks and invalid task due dates do not produce alerts. Task owner is included when recorded.

TypeScript and 27 layout/helper checks passed, including a mixed-currency/draft/completed-task/invalid-date case. This does not complete stock shortage alerts, document-deadline coverage or persisted dismiss/snooze behavior from the reference workbook.
