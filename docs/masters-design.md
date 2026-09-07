# Masters catalogue

Implements the complete supplied “Masters — Final Detailed Design” catalogue, reviewed in full on 7 September 2026. This specification replaces the earlier exploratory Masters inventory. It does not authorise treating unfinished individual master forms as complete.

The landing page contains exactly eight categories and 28 items, in the supplied order. Organisation has only Company Information and Company Addresses. Products & Packaging has Products, Units, Packages, Package Types, Packaging Materials, Quality Specifications and BOM. Business Partners has Customers, Vendors and Delivery Addresses. Trade & Commercial has Ports, Payment Terms, Shipment Terms, Currency and Bank Details. Trade Licences has Advance Licence, EPCG Licence and LC Master. Logistics has Shipping Lines, Shipping Line Charges, Destination Charges and Additional Charges. Documents & Communication has Document Templates and Email Templates. Operations has Expense Types and Order Status.

There are no metric counts, Add Master button, clickable card backgrounds, Branches, Financial Years, Salesperson, Warehouses, notification configuration or user administration in this catalogue. Existing warehouse functionality remains accessible from Inventory. Sidebar subheadings remain removed per the earlier user instruction; category headings on the Masters page are explicitly required by the new specification.

The layout uses three columns on wide desktop, two on medium widths and one on narrow screens. Cards align to the start of each grid row with natural height; the Documents & Communication card spans two columns on the wide layout, matching the supplied wireframe. Each row has an icon, name, separator and directional chevron; only rows navigate. Masters is a direct sidebar destination. Master detail breadcrumbs lead back to Masters.

Local catalogue search matches names and deliberate aliases, not business records or entire category titles. “Shipping” includes Shipment Terms; “customer” includes Delivery Addresses; “package” includes Packaging Materials. Cards without matches disappear; surviving cards contain only matching rows. Search is case-insensitive, whitespace-tolerant and supports clearing. No matches produces the specified text and a search icon.

The server filters catalogue and destination metadata using the user's authenticated role. Categories with no permitted rows are removed. Existing Products, Customers and Vendors routes retain their server-side record permissions. Other rows open a named destination explaining that its record screen has not yet been implemented. Company Information and other master fields are deliberately not designed in this change.

Validation covers exact category and item counts, omitted entities, the specified search examples, unauthenticated access, hidden restricted categories and direct restricted destination requests. Browser visual/interaction UAT has not been performed in this task.
