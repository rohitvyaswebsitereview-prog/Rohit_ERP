# Shipzy-style interface replacement

The authenticated application now mounts a dedicated Shipzy-style workspace. The previous process workspace is no longer the main application interface. Existing business services, permissions, records and document generation remain connected.

## Reference review

Reviewed the 47 reference images and the accompanying image-wise specification workbook. The implementation follows the reference's charcoal navigation, green selection and creation buttons, compact header, summary strip, blue action menus, document shortcuts, tabbed records, invoice folders, payment tabs and grouped master settings. Branding remains Rohit's ERP; reference sample business figures are not copied.

## Implemented screens

- Dashboard with currency-specific totals, running orders, receivables and product sales.
- Quotation, proforma, invoice and operational registers with search, pagination, status tabs, CSV export and direct document actions.
- Record details with General, Product Details, Commercial Details, Shipment Details, Documents and Activity tabs.
- Invoice and proforma document folders, shipment document entry points and checklist.
- Incoming and outgoing payment registers with payment-status tabs and currency selection.
- Master Settings and Logistics Master grouped catalogs.
- Reports catalog and direct module navigation for purchases, production, inventory, finance, shipment tracking, users, domestic documents and imports.
- Existing create/edit forms use the new shell and return to the new record screen after saving.

Imported records are included by default. Historical edit restrictions and server permissions remain enforced. Currency totals do not combine INR and USD.

## Scope boundaries

This is a reconstruction from reference images, not Shipzy source code. Existing specialized forms and report internals are retained inside the new shell. Screenshot-only services without an existing implementation, such as live e-invoice submission and club invoicing, have not been represented as functioning integrations.

## Validation

Production build and TypeScript validation passed. Nine new layout/navigation checks and 143 existing integration checks passed. Integration tests use a disposable database. The running application returned HTTP 200, and the new sidebar and document detail layout were inspected in the local browser.
