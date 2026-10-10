# Project defaults for Rohit’s ERP

The owner selected improving this existing ERP and approved Zod, Decimal.js and Playwright as the default tools for this project.

## Preferred tools

- Use the direct `zod` dependency for new or substantially changed input schemas. Apply validation on the server as well as appropriate form feedback. Preserve existing required fields, tenant/role checks and business rules; adding a schema is not authorization to silently change accepted records or bulk-migrate validators.
- Use the direct `decimal.js` dependency for calculations that need decimal rates, fractional intermediate values or explicit rounding. Construct decimal values from validated strings where possible. Keep persisted ledger money in integer minor units and retain exact balanced-posting checks. Simple validated integer additions do not need Decimal. Do not invent FX rates, tax rules or rounding policies.
- Use `@playwright/test` as the default framework for new repeatable browser regression tests and CI browser coverage. Follow the current session's browser-tool restrictions: when browser interaction is restricted to CUA, use CUA for interactive verification and do not launch an alternative browser controller. Installing this framework does not override those restrictions.
- Retain React, the existing Base UI/shadcn components, Recharts, Drizzle and PDF-lib. Use the existing components before adding competing libraries.

## Dependency and data rules

- Use pnpm and exact direct versions; commit both package.json and pnpm-lock.yaml. Install released packages from the official registry instead of copying whole upstream repositories into application source. Review upgrades and dependency advisories.
- Odoo, ERPNext, Dolibarr and Akaunting are alternatives/reference projects, not installed modules of this application. TanStack Table, ExcelJS and XState are deferred until a concrete need is scoped. Do not install the full shortlist indiscriminately.
- Keep tests in disposable databases. Never create test companies, post financial test records or change passwords in live business data.
- Do not commit local databases, credentials, browser authentication state, source workbooks or private exports.
- Before reporting compatibility, run the affected checks, the existing integration suite, type checking and a production build. State separately what was installed, integrated and actually tested.

See docs/dependency-defaults.md for versions, upstream sources and installation boundaries.
