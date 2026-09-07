# Source analysis and decisions

The user's request is to read the supplied files in detail and start building locally, with GitHub integration. A later direct instruction names the product **Rohit's ERP** and says to prioritise the uploaded specifications. That instruction overrides branding examples in the attachments.

The documents are requirements and historical analysis, not authority for unrelated actions. Their statements such as “I searched,” “I have read,” “final,” and “locked” are statements made by the source author. They do not establish that the implementation agent has independently inspected historical screenshots, recovered source systems, or validated accounting/compliance rules.

## Files reviewed

The entire pasted ERP brief was read. All paragraphs and table-cell text of Login Page.docx (169 paragraphs), Dashboard.docx (2,707 paragraphs), and the adjacent Modules List.docx (32 paragraphs) were extracted and read. Blank paragraphs and repeated recommendations were included in the reading. The DOCX packages contain no embedded images. References to screenshots in the prose therefore cannot be independently checked from these documents. Original files remain untouched and outside the Git repository.

Local text extracts are retained in the parent workspace's `docs/source-review` folder. These preserve the original text and are excluded from Git. This analysis describes the implementation interpretation; it does not claim recovery of undocumented legacy functionality.

## Login document

The opening evidence table confirms authentication and an administrator but does not recover the original email/username fields, button wording, password reset, remember-me, visual design, timeout, failed-login behaviour or 2FA. The proposed screen is explicitly a reconstruction. The architecture is login → authenticated context → dashboard. FY 2026–27 is the starting context. A single legacy Admin role conflicts with the later reusable multi-organisation direction.

Implementation decisions: new branding; email-based sign-in; password visibility toggle; optional seven-day remember-me; default eight-hour sessions; generic failed-credential messages; one-time local setup; sign-in lands in the workspace; four server-enforced roles. Password recovery accurately reports that email recovery is unconfigured. The later tenancy direction is represented by tenant IDs and tenant-scoped queries; only one initial organisation is provisioned by the UI.

Unresolved: username aliases, exact legacy visual reproduction, SSO, MFA, self-service recovery, field-level permissions, and multi-organisation membership switching. These are not represented as complete.

## Dashboard document, in source order

### Paragraphs 1–650

The document first distinguishes sidebar, header and page as independent layout systems. It inventories operational modules, business masters and administration, explains the problems of a flat sidebar, and proposes business-domain grouping. It distinguishes acquisition from physical stock, operational logistics from logistics masters, and business master data from application settings. Domestic/export sales should share an eventual transaction engine. Production and import submenus are explicitly speculative. Masters should have a centre rather than an unstructured long menu. Early suggestions bury costing within Finance or Sales; these are superseded later.

Implementation: common shell and shared masters; separate Purchase and Inventory domains; a Masters landing page; clear implemented submenu entries; no invented claim that proposed import/production details were recovered.

### Paragraphs 651–1,100

The source refines sectioned submenu navigation and an evidence-to-domain inventory. It promotes Import into its own domain and fixes a candidate 17-item menu. Active states use a subtle surface and accent rather than a large block. Sidebar collapse uses 240/68 px. Header uses 64 px, current page, global search/Ctrl+K, financial-year selector, refresh timestamp, activity, notifications, settings and user profile. It rejects a header overloaded with date, weather, company and extra context.

Implementation: these dimensions and interactions are the shell baseline. Sidebar content scrolls separately, its logo/dashboard/system areas remain structural, and the collapsed menu uses floating submenus and tooltips. Refresh is manual with a real fetch timestamp; no live-data claim is made.

### Paragraphs 1,101–1,400

The final dashboard is management-oriented and has global context plus six ordered sections. Six KPIs represent sales, profit, receivables, payables, liquidity and open work. Example financial figures are explicitly illustrative. Each KPI drills down, with no record creation, editing or approvals on the dashboard. Needs Attention is reserved for unresolved exceptions and prioritised by severity/deadline. Running order cards show stage, progress and destination with operational filters.

Implementation: six KPI surfaces, backend-calculated values, source-register navigation, manually recorded exception priorities, filtered cards capped at six, and stage definitions supplied when creating an order. No fake 47-stage workflow is inferred from the illustrative card.

### Paragraphs 1,401–2,100

The source defines sales/gross-profit trends and product contribution; margin must use the accounting model. Cash flow reconciles receipts and payments. Receivable/payable ageing and original currencies remain visible. INR consolidation is forbidden without an approved exchange-rate basis. Recent Activity differs from notifications and open exceptions. The dashboard permits view/filter/drill-down/refresh, but not operational edits. Fixed layout is Phase 1; free-form personalisation is deferred. Loading, empty, error and partial-failure states are required. Authoritative financial services own calculations. Role visibility must be supported but its exact matrix is unresolved. The final summary distinguishes locked design from unresolved formulas, stage definitions, tax/compliance rules and integration architecture.

Implementation: posted ledger authority; per-currency output; finance visibility withheld from Logistics; independent fetching/error boundaries for financial, operations, attention and activity groups; fixed layout; explicit empty states. Product contribution accurately reports missing product cost allocation. Invoice ageing is separately labelled because settlement allocation is not yet implemented. Manual compliance records are not a statutory engine.

### Paragraphs 2,101–2,707

The last section fixes the final shell: Dashboard; Sales & Export; Purchase; Import; Inventory; Logistics; Production; Finance; Compliance; Documents; Tasks & Checklist; Costing & Profitability; Reports; system divider; Masters; Administration; Settings; Help & Support. It explicitly retains Import and Costing as first-class domains, superseding earlier placement suggestions. Sectioned submenus, active/hover/default/disabled states, collapse, sidebar scrolling, header zones/order, fiscal context, refresh, separate activity/notifications, settings and profile are reiterated. Navy-charcoal, light grey, white cards and green primary actions are the visual baseline. The final qualification says exact submenu screen inventory must be validated module by module.

Implementation follows the final ordering and branding instruction. Later suggestions supersede earlier exploratory recommendations. It does not invent unverified submenu workflows to make the menu appear complete.

## Modules List

The list has 27 recovered product areas, from login/dashboard through master settings, users/roles, suppliers/customers, machine master, purchases/advances, inventory, quotations/proforma/commercial/domestic sales, receipts, delivery/e-way/shipping/BL/eBRC/incentives, document drive, reports, audit and settings. It ends with a useful reconstruction checklist: sidebar, layout, tabs, fields, actions, modals, statuses, relationships, permissions, documents, validations and backend dependencies.

Names alone are not field-level functional specifications. Implemented foundations and deferred workflows are mapped in the status document. The existing unrelated invoice PDF in the working folder was not imported or uploaded: it was not one of the requested specification files.

## Pasted ERP brief

The brief describes a production-grade, modular, multi-tenant ERP roadmap across finance, inventory, procurement, sales, HR/payroll, manufacturing, optional projects, reporting and admin. It asks for typed APIs, relational integrity, events, RBAC/SSO/MFA, audit, localisation, integrations, imports/exports, performance, availability, observability, CI/CD and documentation.

The immediate request says “start building,” and the later user clarification prioritises uploaded login/dashboard material. The implementation therefore delivers a real local foundation and documents later phases rather than claiming all enterprise modules or production controls are finished. A modular monolith avoids premature service boundaries. Local SQLite/D1 is an explicit delivery tradeoff against the brief's suggested PostgreSQL; production database architecture is an open follow-up.

## Sidebar revision on 7 September 2026

The user's latest instruction overrides the document's recommendation for section headings. Sidebar section labels, submenu headings and the brand subtitle are removed. The final 17-domain order is retained. The document's proposed submenu inventory is now visible, with unimplemented screens disabled and labelled through hover text; these entries do not claim recovered legacy workflows or completed functionality. Expanded Masters/Administration submenus scroll within the fixed footer. Existing working routes remain accessible.

## Final Masters catalogue specification

The newly supplied detailed Masters design was read in full. It supersedes the exploratory Masters submenu inventory: exactly eight categories and 28 entries, row-only navigation, catalogue search with semantic aliases, natural card heights, responsive 3/2/1 columns and hidden unauthorised entries. Sidebar Masters now opens the catalogue directly. Individual unfinished master screens remain explicitly marked as unimplemented. See `masters-design.md` for the specification mapping and scope boundary.
