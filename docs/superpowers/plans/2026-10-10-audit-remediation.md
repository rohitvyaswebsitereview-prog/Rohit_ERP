# Audit remediation implementation plan

Goal: implement the owner's approved 10 October audit recommendations, preserve business data, and provide a verified local review site.

Design source: the detailed audit (F01–F28) and improvement report (R01–R27), approved by the owner's request to implement. Work in the existing checkout; deploy only after integrated verification. No speculative opening journals, company identifiers, exchange rates, tax rules or provider delivery claims.

Architecture: retain the existing React workspace and tenant-scoped API; fix shared calculations and permission boundaries, add additive controls, and expose missing configuration honestly. Existing persisted records and uploaded files remain authoritative. Tests use disposable databases.

Technology: TypeScript, React, vinext, Cloudflare local D1/R2, SQLite backups, Node integration tests.

## Execution

- [ ] Protect current local state; verify baseline and a separate backup restore (R09).
- [ ] Shared access serialization, safe upload contents, honest audit events, read-only relationship inference, year-aware search/activity (R03,R12,R16,R19,R22). Owner: access implementation agent; files lib/server/service.ts, sales.ts, relationships.ts, new access/upload helpers and targeted tests. Coordinate operations.ts edits with primary agent.
- [ ] Simplify navigation, correct valuation/tax/costing report presentation, clearly label setup and guides (R04,R06,R08,R14,R17,R18,R27). Owner: UI implementation agent; components/shipzy-workspace.tsx, operation-reports.tsx, operation-stock.tsx, dashboard.tsx, header-feed.tsx and dedicated presentation helpers/tests. Do not alter shared finance calculations.
- [ ] Fix effective dated invoice/settlement status and cost coverage (R02,R07). Owner: primary; lib/domain.ts, targeted historical finance tests.
- [ ] Add controlled financial-year locks/defaults; evaluate stock/settlement/purchase/production controls against approved policies (R01,R10,R11,R13,R20,R26). Owner: primary; operations.ts, finance helpers, tests. Explicit transaction rates required before conversion; never mix currencies arithmetically.
- [ ] Maintain recommendation-by-recommendation acceptance register, migration/provider prerequisites and isolated UAT evidence (R05,R21,R23,R24,R25).
- [ ] Fresh integrated tests, type check, production build, local restart, browser walkthrough and independent review; fix review issues and publish review link.

## Review focus

Historical reports must preserve earlier balances despite later reversals. Restricted roles must not recover protected values through nesting/history/exports. Stock quantity and accounting value must reconcile, and no conversion may default to an invented rate. Tax totals must exclude drafts by default. GET requests must not persist inferred links. Period locks must apply at posting boundaries, not only UI. Backup rehearsal must use a separate destination. Clearly distinguish implemented software, verified automated checks, owner acceptance, and missing external inputs.

## Completion rules

Each R01–R27 receives actual behavior, evidence, remaining work and responsible party in docs/audit-acceptance-2026-10-10.md. A page rendering is not business acceptance. Provider integration, company setup and opening balances remain awaiting real inputs until supplied. No claim that the whole ERP is flawless.
