# Default open-source tools

Owner approved on 10 October 2026 for improving the existing Rohit’s ERP.

| Tool | Pinned package | Default purpose | Upstream |
|---|---|---|---|
| Zod | zod 4.6.5 | New/changed input validation schemas | https://github.com/colinhacks/zod |
| Decimal.js | decimal.js 10.6.0 | Explicit decimal arithmetic and rounding when needed | https://github.com/MikeMcl/decimal.js |
| Playwright Test | @playwright/test 1.64.0 (development dependency) | New repeatable browser regression tests | https://github.com/microsoft/playwright |

Install the project's declared dependencies with `pnpm install --frozen-lockfile`. Direct versions are pinned in package.json and resolved packages/integrity hashes are in pnpm-lock.yaml. Zod and Decimal.js report MIT licensing; Playwright Test reports Apache-2.0. Upstream license files remain in their installed packages.

## Scope

Installation makes these libraries available. It does not retrofit every existing validator or money calculation, generate a complete browser test suite, or complete pending ERP business functionality. Follow AGENTS.md for new work; integrate each library into an affected flow with appropriate regression checks. Existing integer minor-unit accounting remains unchanged.

Playwright's framework package and browser binaries are separate installations. When setting up a permitted browser-test runner, use `pnpm exec playwright install chromium` and supply the operating-system dependencies required by the official Playwright documentation. This setup does not install global system packages, store user login state or run business-changing browser tests. Interactive verification in sessions restricted to CUA must continue using CUA.

## Retained and deferred projects

Existing React, Base UI/shadcn, Recharts, Drizzle and PDF-lib remain the defaults for their respective areas. Full ERP systems (Odoo, ERPNext, Dolibarr, Akaunting) are not added alongside this application. TanStack Table, ExcelJS and XState remain optional candidates for a later scoped change. Popularity alone is not a requirement to install a dependency.

## Verification

Installation and checks are recorded in outputs/repository-review/installation-verification.md on the local computer. This document states selected defaults; the local verification record contains actual results and any reported advisories.

On 10 October 2026, all 26 existing automated suites, type checking, production build and frozen-lockfile installation passed. Installed-library checks passed. No browser was launched using Playwright.

The full dependency audit reported 45 advisories in pre-existing dependencies (6 low, 17 moderate, 19 high, 3 critical), with no reported paths through the three newly installed tools. The scan is not clean. Existing build/development and transitive dependencies need a separate reviewed upgrade effort; installation did not change the affected existing versions. Detailed advisories are retained in the local installation report. Do not infer production security approval from passing functional tests.
