# Page wiring repair and verification

User has authorised repairing the ERP, preserving existing business data.

1. Reproduce company Save and inventory all form submissions. Add a regression guard, repair explicit submit buttons, verify required-field errors and successful persisted company creation in an isolated database.
2. Trace dashboard amounts. Historical imports must remain unposted. Show original-currency recorded business totals separately from posted accounts; link each total to precisely the included records. Test date/year/status/currency rules and totals against live data using read-only checks.
3. Inspect every navigation destination and its implementation, check visible loading/error/empty states, inspect controls for missing handlers, and repair confirmed faults. Record what was browser tested, integration tested, or only inspected; never label untested actions as passed.
4. Run the existing integration and regression suites, type check, production build, restart local service, and recheck the original symptoms in the browser. Provide the local review link and a plain-language verification register, with remaining limitations.

Confirmed initial evidence: company Save renders as type=button and clicking produces no validation or network-backed response. Login and legacy register Save already use type=submit. Dashboard ledger is empty while the database contains historical imported invoices and settlements.
