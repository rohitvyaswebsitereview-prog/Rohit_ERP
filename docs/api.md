# API reference

Base URL: `http://127.0.0.1:3000/api/v1`. JSON request/response bodies. Session cookie authentication. Mutations require `Content-Type: application/json` and same-origin requests. All record references resolve within the authenticated organisation. An ID from another organisation returns not-found/validation failure.

| Method | Path | Behaviour |
|---|---|---|
| GET | `/status` | Whether one-time setup is needed |
| POST | `/setup` | Initial Admin creation on localhost; name/email/password |
| POST | `/login` | Email/password and optional remember boolean |
| GET | `/me` | Current user and organisation context |
| POST | `/logout` | Revoke current session |
| POST | `/password` | Current password + new password; revoke all sessions |
| GET/POST | `/preferences` | Current user's FY and period |
| GET/POST | `/users` | Admin-only user listing/creation |
| GET | `/records?fy=2026–27` | Permitted records; shared masters and movement history included |
| POST | `/records/{kind}` | Validate and create a record; financial journals are immediately posted |
| POST | `/records/{kind}/{id}/post` | Post draft invoice or expense bill atomically once |
| POST | `/records/{kind}/{id}/status` | Version-checked order, purchase order, task or exception update |
| GET | `/dashboard?fy=2026–27&start=2026-04-01&end=2026-09-06` | Authoritative period financial summaries and operational snapshots |
| GET | `/search?fy=2026–27&q=term` | Up to 40 matching accessible record names/references |
| GET | `/activity` | Most recent 100 accessible audit events |
| GET | `/notifications?fy=2026–27` | Open manual exceptions with user read state |
| POST | `/notifications/read` | Mark the user's currently recorded exception notifications read |

Kinds: `customers`, `vendors`, `products`, `warehouses`, `orders`, `purchase-orders`, `invoices`, `bills`, `journal`, `movements`, `exceptions`, `tasks`, `documents`.

## Example invoice

```json
{
  "reference": "INV/001/26-27",
  "date": "2026-09-06",
  "partnerId": "a-customer-id-from-this-organisation",
  "currency": "INR",
  "amount": "1234.56",
  "dueDate": "2026-10-06"
}
```

Create returns `{ "id": "..." }` with HTTP 201. Fetch records for persisted details. Money request strings allow two decimals; stored and returned amounts are integer minor units. Journal lines use integer debit/credit values and valid account codes. No floating-point equality is used to validate journals.

## Errors

400 validation failure; 401 unauthenticated/expired session; 403 role/origin/host restriction; 404 unknown endpoint/record; 409 existing record, concurrent update or duplicate posting; 413 oversized advertised request; 415 non-JSON mutation; 429 login throttling; 500 database failure.

No external webhook or OpenAPI/Swagger endpoint is implemented yet. The reference above describes only executable endpoints; machine-readable schemas and stricter discriminated request types are planned with module schema extraction.
