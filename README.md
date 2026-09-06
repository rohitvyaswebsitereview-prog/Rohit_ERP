# Rohit's ERP

A working local ERP foundation based on the supplied login, dashboard and application-shell specifications. The current release prioritises those documents. It is an initial implementation, not a complete production ERP.

## Run locally

Requires Node.js 22.13 or later and pnpm 11.19.0.

```bash
pnpm install --frozen-lockfile
pnpm dev --hostname 127.0.0.1 --port 3000
```

Open http://127.0.0.1:3000 and create your administrator account. There is no default password and no seeded business data. Setup is available once, on localhost. On the original computer, run the `Start Rohits ERP.sh` launcher one directory above this application.

## Included

- Local administrator setup, password sign-in, remember-me sessions, logout, password changes and login throttling.
- Tenant-scoped database access and Admin, Finance, Logistics and Viewer roles.
- The specified 240/68 px sidebar, 64 px header, 17 navigation domains, financial-year context and Ctrl+K global record search.
- Six dashboard sections, original-currency amounts, financial-year and date filters, order progress, separate notifications and recent activity, and loading/error/empty states.
- Customer, vendor, product and warehouse masters; sales-order and purchase-order registers; draft invoices and expense bills.
- Exactly-once document posting into balanced journal entries; immutable audit events; integer minor-unit amounts.
- Physical stock receipts and issues with atomic protection against negative stock, including concurrent issues.
- Manual compliance exceptions, tasks, document links, CSV exports, chart of accounts and basic financial reports.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

Integration tests create their own disposable database. They do not alter your local records. See [verification.md](docs/verification.md).

## Important scope boundaries

No external business integration is active. No statutory deadlines, taxes, exchange rates, or legal compliance are inferred. Invoice lines, tax calculation, cost allocation, settlement allocation, bank reconciliation, purchase matching, serialized inventory, full import/production workflows, payroll, document generation/uploads, SSO/MFA, approval rules and production hardening remain later work. The UI says when a view needs further implementation.

Gross profit is posted revenue minus posted cost-of-goods entries. It is meaningful only when all applicable costs have been posted. Invoices post receivables/revenue. Expense bills post operating expense/payables; they are not stock-purchase invoices. Manual stock movements do not automatically post valuation. Invoice ageing does not allocate manual journal settlements; ledger balances and invoice ageing are deliberately labelled separately.

Dashboard balances include prior-year posted ledger history through the selected as-of date. Running operations are scoped to the selected financial year. Stock on hand includes movement history across years. Register lists and global search use the selected financial year, except shared master data.

## Data and backups

Local D1 is SQLite, stored under `.wrangler/state/`. Never commit this folder, environment files, passwords, source attachments or exports. Stop the app before copying the entire `.wrangler/state` directory to a secure backup. Restore by stopping the app and replacing that directory with the backup. Verify restored access and balances before resuming entry. A database administrator can bypass application permissions, so filesystem access must be restricted appropriately.

The application has no background email/SMS sender, cloud deployment or external database. GitHub contains application source only. Local HTTP is intended for loopback use; do not expose the development server to a network.

## Documentation

- [Source analysis and decision record](docs/source-analysis.md)
- [Feature status and delivery phases](docs/implementation-status.md)
- [Architecture and data model](docs/architecture.md)
- [API reference](docs/api.md)
- [Setup and recovery](docs/setup.md)
- [Verification](docs/verification.md)

The standalone repository root is this `app` directory. GitHub: https://github.com/rohitvyaswebsitereview-prog/Rohit_ERP
