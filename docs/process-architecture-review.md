# Process architecture and implementation review

Reference: the complete 30-section architecture request supplied on 10 September 2026. All paragraphs, examples, diagrams and the final recommendation were read. Example customer figures and transaction IDs were not inserted as new business data. The document contains alternative navigation proposals; the final implementation uses short primary module links with contextual module navigation, retaining existing URLs.

## Architecture decisions

A transaction workspace is a stable view of an existing business record and its confirmed relationships. Its ID is the existing immutable record ID, not a new copy of an invoice. Export invoices anchor export workspaces; converted quotations do not create a second workspace when a confirmed invoice exists. Existing transaction editors, accounting posting rules, permission checks, original records and audit history remain authoritative.

The three dimensions are implemented independently:

- **Business object:** existing operation definitions, with actual references, fields, documents, roles and transitions.
- **Lifecycle:** a shared derived model for sales, exports, procurement, serialized inventory, finance and compliance. Each stage exposes status, owner, document/field requirements, dependencies, due date, next action, exceptions, linked record IDs and destination route. Evidence means a record has been recorded; it is not external certification. Draft/cancelled bank evidence cannot satisfy realisation.
- **Relationships:** explicit references and reviewed links propagate navigation. Derived candidate matches remain separate and cannot satisfy lifecycle requirements or allocate funds.

Stage completion is derived from recorded evidence. It does not post money, submit to government systems or automatically close a transaction. Final closure retains the existing business status and controls. Missing optional steps must be reviewed rather than silently assumed complete. Lifecycle-generated work is displayed automatically; assigning it saves an owned task with a due date and audit entry. Repeated assignment of an open action is rejected.

## Complete reference coverage

| Section | Implementation |
|---|---|
| 1. Fundamental change | Transaction identity, process state, next action, lifecycle and supporting information form the shared record layout. |
| 2. Top-level architecture | Single-level sidebar; Sales, Procurement, Logistics, Finance, Inventory, Compliance and Documents open contextual workspaces. Global header contains search, Create, My work, alerts, user, year and data view. |
| 3. Transaction | Existing immutable record ID anchors the operational workspace and connected commercial, shipment, equipment and financial evidence. |
| 4. One workspace | `/transactions?record=<id>` opens the same shared workspace from search, work lists and related records. Legacy detail URLs remain compatible. |
| 5. Checklist replacement | Five-stage export rail replaces the visible 12-check block; each stage opens evidence, dependencies, owner, due date, linked records and action. |
| 6. Record header | Identity, status, separate source badge, recorded currencies, edit/actions, document action and More. Next action is directly underneath. |
| 7. Lifecycle | Clickable process rail, with active stage emphasis; sales, procurement, finance, compliance and unit histories have their own stages. |
| 8. Six tabs | Overview, Documents, Finance, Items, Activity, Related. Audit/source/connection utilities live in the header More menu. |
| 9. Simpler overview | Compact financial position and key facts; no line grid or accounting reconciliation in Overview. |
| 10. Reconciliation | Finance starts with grouped currency balances and expandable record counts. Detailed reconciliation is a separate action. |
| 11. Historical layer | Separate Live, Historical and Imported classification; global Operational, Operational + Historical, Historical only, Imported / Migration filters. All data is an additional explicit option. Original historical records are not changed. A visible count explains filtered records. |
| 12. Customer | Profile, current transactions and open financial items, with contact/address/terms details progressively disclosed. A customer does not inherit an export checklist. |
| 13. Product hierarchy | Existing product/equipment-model definitions lead to linked serialized units. No duplicate model database is introduced. |
| 14. Serialized unit | Unit identity, sale, customer, cost, product links and purchased-through-delivered evidence. Sold alone does not prove delivery. |
| 15. Document center | Searchable status views, actual uploaded files plus pending lifecycle evidence. Detail viewer supports PDF/images, metadata, download, transaction/customer/shipment links and available audit history. Other file types download without unsafe inline rendering. |
| 16. Gap-generated tasks | Missing BL, bank evidence, eBRC and other stages yield work automatically. Assignment uses existing audited tasks with owner and due date; duplicate open actions are prevented. |
| 17. Dashboard | Attention count, overdue/due-today counts, priority actions, active transactions and a secondary financial snapshot. No fabricated deadlines. |
| 18. Global search | Direct matches expand through confirmed relationships. Role filtering and the chosen data view apply. Search returns at most 120 records per query; refine large result sets. |
| 19. Final navigation | Module hubs include existing commercial, import/export, transport, inventory, financial and compliance pages. My work/calendar and system tools remain directly reachable. Packing lists open the existing document workflow; no dead placeholder route. |
| 20. Relationship graph | Existing graph reused, with invoice-scoped lifecycle evidence preventing another invoice's bank evidence from satisfying closure. |
| 21. Visual language | Light canvas, one blue accent, compact readable lists, neutral statuses, restrained borders and no heavy shadows. |
| 22. Card rule | Identity and key facts use structured fields. Decision areas and independent work groups use panels; decorative field cards are removed. |
| 23. Tables | Column controls and locally saved search/status views on shared operation and sales lists; transaction list has optional detail columns and selected-row CSV export. |
| 24. List vs detail | Lists focus on finding/filtering; details focus on identity, process, evidence and action. Related record collections are searchable and paginated. |
| 25. Primary question | Module hubs, attention dashboard, profiles, item history, document gaps and finance summaries each use the purpose specified in the reference. |
| 26. Lifecycle engine | Shared stage model drives rail, next action and work dashboard. Actual operation definitions supply the full field/transition/permission map. |
| 27. Status architecture | Process state is derived separately from source classification. Existing raw statuses are retained for audited transitions; imported does not become a fake business completion state. |
| 28. Three dimensions | Business object definitions, lifecycle state and relationships are separate shared modules instead of per-screen logic. |
| 29. Exclusions | No giant sidebar, default reconciliation dump, tabs inside lifecycle tabs, repeated related grids or silent mixing of imported and operational records. |
| 30. Sequence and map | Navigation/object definitions and lifecycle model preceded workspace integration. Settings → Architecture & lifecycle map exposes every permitted entity, relationship source, required field, document, status transition, role and destination using live definitions. |

## Definitive map

The in-app **Settings → Architecture & lifecycle map** is generated from `operationModules`. It stays consistent with the actual editor/API definitions instead of a separately maintained diagram. It covers every currently implemented business object. The process model is in `lib/workflow.ts`; primary/context navigation is in `lib/workspace-navigation.ts`.

## Verification

- 143 integration checks passed against a disposable database, including existing accounting/import/security workflows and new workspace/search/filter/task checks.
- 13 focused lifecycle/navigation checks passed, including invoice isolation, missing BL, bank evidence, draft/cancelled evidence, source filters, machine delivery and route resolution.
- 13 record-presentation checks passed, including escaped text, separate currency labels and no technical import keys in Overview.
- TypeScript check and production build passed. The local service was restarted; Dashboard, Transactions, Documents and Architecture map returned HTTP 200.
- No browser interaction/visual test was run. These checks do not constitute a guarantee that the software has zero defects.

## Data and service boundaries

No workbook data was re-imported or rewritten. No guessed relationship, deadline, payment allocation or external certification was created. The pre-existing email delivery, statutory provider integration and document-generation capabilities retain their actual limits. This change provides the requested process architecture and operational presentation; it does not turn local recorded evidence into a government or bank submission.
