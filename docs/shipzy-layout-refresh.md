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
