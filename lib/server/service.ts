import { sales } from './sales';
import { opMap, permittedOperation } from '../operations';
import { operations } from './operations';
import { permittedMasters, masterItems } from '../masters';
import { env } from 'cloudflare:workers';
import { schema } from './schema';
import {
  kinds,
  masterKinds,
  moneyMinor,
  validDate,
  fiscalYear,
  assertBalanced,
  dashboard,
} from '../domain';
import type { RecordData } from '../domain';
let ready: Promise<unknown> | undefined;
const db = () => env.DB;
async function init() {
  if (!ready)
    ready = db()
      .batch(schema.map((s) => db().prepare(s)))
      .catch((e) => {
        ready = undefined;
        throw e;
      });
  await ready;
}
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
async function digest(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
async function passwordHash(password: string, salt = id()) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256,
  );
  return (
    salt +
    ':' +
    Array.from(new Uint8Array(bits))
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let n = 0;
  for (let i = 0; i < a.length; i++) n |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return n === 0;
}
function text(v: unknown, label: string, max = 200) {
  if (typeof v !== 'string' || !v.trim() || v.length > max)
    throw new Error(`${label} is required (maximum ${max} characters).`);
  return v.trim();
}
function safeRecord(r: any, u: any) {
  if (u.role === 'Logistics') {
    const out = { ...r };
    for (const k of [
      'cost',
      'amount',
      'defaultRate',
      'creditLimit',
      'accountNumber',
      'bankAccounts',
      'bankName',
      'pan',
      'gstin',
      'currency',
    ])
      delete out[k];
    return out;
  }
  if (u.role !== 'Viewer') return r;
  const out = { ...r };
  if (out.bankAccounts)
    out.bankAccounts = out.bankAccounts.map((a: any) => ({
      ...a,
      number: '••••' + String(a.number || '').slice(-4),
    }));
  for (const k of [
    'accountNumber',
    'pan',
    'gstin',
    'customerGstin',
    'taxRegistrations',
  ])
    if (out[k]) out[k] = '••••' + String(out[k]).slice(-4);
  return out;
}
const decode = (r: any): RecordData => ({
  ...JSON.parse(r.data),
  id: r.id,
  kind: r.kind,
  fy: r.fy,
  version: r.version,
  created: r.created,
});
async function records(tenant: string, fy?: string) {
  const q = fy
    ? db()
        .prepare(
          `SELECT * FROM records WHERE tenant_id=? AND (fy=? OR kind IN ('customers','vendors','products','warehouses','movements')) ORDER BY created DESC`,
        )
        .bind(tenant, fy)
    : db()
        .prepare(
          'SELECT * FROM records WHERE tenant_id=? ORDER BY created DESC',
        )
        .bind(tenant);
  return (await q.all()).results.map(decode);
}
function audit(
  u: any,
  action: string,
  kind: string,
  record: string,
  detail: string,
) {
  return db()
    .prepare('INSERT INTO audit VALUES (?,?,?,?,?,?,?,?)')
    .bind(id(), u.tenant_id, u.id, action, record, kind, detail, now());
}
function insert(u: any, kind: string, data: any, record = id()) {
  return db()
    .prepare(
      'INSERT INTO records(id,tenant_id,kind,fy,data,created) VALUES (?,?,?,?,?,?)',
    )
    .bind(
      record,
      u.tenant_id,
      kind,
      data.date ? fiscalYear(data.date) : 'master',
      JSON.stringify(data),
      now(),
    );
}
const permissions: Record<string, string[]> = {
  Admin: [...kinds],
  Finance: [
    'customers',
    'vendors',
    'invoices',
    'bills',
    'journal',
    'exceptions',
    'documents',
  ],
  Logistics: [
    'customers',
    'products',
    'warehouses',
    'orders',
    'exceptions',
    'tasks',
    'documents',
  ],
  Viewer: [...kinds],
};
async function authenticate(req: Request) {
  const token = (req.headers.get('Cookie') || '').match(
    /(?:^|; )erp_session=([^;]+)/,
  )?.[1];
  if (!token) return null;
  return db()
    .prepare(
      'SELECT u.id,u.tenant_id,u.email,u.name,u.role,t.name company FROM sessions s JOIN users u ON u.id=s.user_id JOIN tenants t ON t.id=u.tenant_id WHERE s.token=? AND s.expires>? AND u.active=1',
    )
    .bind(await digest(token), Date.now())
    .first<any>();
}
async function session(u: any, remember: boolean, req: Request) {
  const token = id() + id();
  const seconds = remember ? 604800 : 28800;
  await db()
    .prepare('INSERT INTO sessions VALUES (?,?,?)')
    .bind(await digest(token), u.id, Date.now() + seconds * 1000)
    .run();
  return json({ user: u }, 200, {
    'Set-Cookie': `erp_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${seconds}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`,
  });
}
async function validate(kind: string, b: any, u: any) {
  const d: any = {};
  if (masterKinds.includes(kind)) {
    d.name = text(b.name, 'Name');
    if (['customers', 'vendors'].includes(kind)) {
      d.email = String(b.email || '').slice(0, 200);
      d.country = text(b.country || 'India', 'Country');
    }
    if (kind === 'products') {
      d.sku = text(b.sku, 'SKU');
      d.unit = text(b.unit || 'PCS', 'Unit');
      d.reorderPoint = Number(b.reorderPoint || 0);
      if (!Number.isSafeInteger(d.reorderPoint) || d.reorderPoint < 0)
        throw new Error('Reorder point must be a non-negative whole number.');
    }
    return d;
  }
  d.date = validDate(b.date);
  d.reference = text(b.reference, 'Reference');
  if (['orders', 'purchase-orders', 'invoices', 'bills'].includes(kind)) {
    d.partnerId = text(b.partnerId, 'Business partner');
    const expected = ['purchase-orders', 'bills'].includes(kind)
      ? 'vendors'
      : 'customers';
    if (
      !(await db()
        .prepare('SELECT id FROM records WHERE id=? AND tenant_id=? AND kind=?')
        .bind(d.partnerId, u.tenant_id, expected)
        .first())
    )
      throw new Error('Select a valid business partner.');
    d.currency = text(b.currency, 'Currency');
    if (!['INR', 'USD', 'EUR', 'GBP', 'AED'].includes(d.currency))
      throw new Error('Unsupported currency.');
    d.amount = moneyMinor(b.amount);
    if (!d.amount) throw new Error('Amount must be greater than zero.');
    d.dueDate = validDate(b.dueDate || b.date);
    if (d.dueDate < d.date)
      throw new Error('Due date cannot precede document date.');
    d.status = 'Draft';
    if (kind === 'orders') {
      d.destination = text(b.destination, 'Destination');
      d.stage = 1;
      d.stageName = 'Order created';
      d.totalStages = Number(b.totalStages || 1);
      if (
        !Number.isInteger(d.totalStages) ||
        d.totalStages < 1 ||
        d.totalStages > 100
      )
        throw new Error('Stages must be between 1 and 100.');
      d.etd = b.etd ? validDate(b.etd) : '';
      d.eta = b.eta ? validDate(b.eta) : '';
    }
  }
  if (kind === 'journal') {
    d.currency = text(b.currency, 'Currency');
    if (!['INR', 'USD', 'EUR', 'GBP', 'AED'].includes(d.currency))
      throw new Error('Unsupported currency.');
    d.lines = b.lines;
    assertBalanced(d.lines);
    d.status = 'Posted';
    d.memo = text(b.memo || b.reference, 'Description', 1000);
  }
  if (kind === 'movements') {
    d.productId = text(b.productId, 'Product');
    d.warehouseId = text(b.warehouseId, 'Warehouse');
    for (const [field, k] of [
      ['productId', 'products'],
      ['warehouseId', 'warehouses'],
    ]) {
      if (
        !(await db()
          .prepare(
            'SELECT id FROM records WHERE id=? AND tenant_id=? AND kind=?',
          )
          .bind(d[field], u.tenant_id, k)
          .first())
      )
        throw new Error(`Select a valid ${k}.`);
    }
    d.quantity = Number(b.quantity);
    if (!Number.isSafeInteger(d.quantity) || d.quantity <= 0)
      throw new Error('Quantity must be a positive whole number.');
    d.direction = b.direction;
    if (!['Receipt', 'Issue'].includes(d.direction))
      throw new Error('Select Receipt or Issue.');
    d.reason = text(b.reason, 'Reason');
    d.status = 'Posted';
  }
  if (kind === 'exceptions') {
    d.name = text(b.name, 'Exception');
    d.category = text(b.category, 'Category');
    d.severity = text(b.severity, 'Severity');
    if (!['Critical', 'Warning', 'Attention'].includes(d.severity))
      throw new Error('Invalid severity.');
    d.dueDate = validDate(b.dueDate);
    d.status = 'Open';
    d.notes = String(b.notes || '').slice(0, 2000);
  }
  if (kind === 'tasks') {
    d.name = text(b.name, 'Task');
    d.dueDate = validDate(b.dueDate);
    d.status = 'Open';
    d.notes = String(b.notes || '').slice(0, 2000);
  }
  if (kind === 'documents') {
    d.name = text(b.name, 'Document name');
    d.category = text(b.category, 'Category');
    d.url = text(b.url, 'Document URL', 1500);
    if (!/^https:\/\//.test(d.url))
      throw new Error('Document links must use HTTPS.');
    d.status = 'Linked';
  }
  return d;
}
export async function handle(req: Request) {
  try {
    await init();
    const url = new URL(req.url),
      path = url.pathname.replace(/^\/api\/v1\/?/, '');
    if (!['GET', 'HEAD'].includes(req.method)) {
      const origin = req.headers.get('Origin');
      if (origin && origin !== url.origin)
        return json({ error: 'Cross-origin request blocked.' }, 403);
      if (!req.headers.get('Content-Type')?.includes('application/json'))
        return json({ error: 'JSON content type required.' }, 415);
      if (
        Number(req.headers.get('Content-Length') || 0) >
        (path.startsWith('operations/')
          ? 7500000
          : path.startsWith('sales/')
            ? 200000
            : 100000)
      )
        return json({ error: 'Request is too large.' }, 413);
    }
    const bodyText = req.method === 'GET' ? '' : await req.text();
    if (
      bodyText.length >
      (path.startsWith('operations/')
        ? 7500000
        : path.startsWith('sales/')
          ? 200000
          : 100000)
    )
      return json({ error: 'Request is too large.' }, 413);
    const b = bodyText ? JSON.parse(bodyText) : {};
    if (path === 'status' && req.method === 'GET')
      return json({
        setupRequired: !(await db()
          .prepare('SELECT id FROM users LIMIT 1')
          .first()),
      });
    if (path === 'setup' && req.method === 'POST') {
      const host = url.hostname;
      if (!['localhost', '127.0.0.1', '[::1]'].includes(host))
        return json(
          { error: 'Initial setup is available only on localhost.' },
          403,
        );
      if (await db().prepare('SELECT id FROM users LIMIT 1').first())
        return json({ error: 'Setup is already complete.' }, 409);
      const email = text(b.email, 'Email').toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Enter a valid email.');
      if (
        typeof b.password !== 'string' ||
        b.password.length < 12 ||
        b.password.length > 200
      )
        throw new Error('Use a password of 12–200 characters.');
      const u = {
        id: id(),
        tenant_id: 'initial',
        name: text(b.name, 'Name'),
        email,
        role: 'Admin',
        company: "Rohit's ERP",
      };
      await db().batch([
        db()
          .prepare('INSERT INTO tenants VALUES (?,?)')
          .bind(u.tenant_id, u.company),
        db()
          .prepare(
            'INSERT INTO users(id,tenant_id,email,name,password,role) VALUES (?,?,?,?,?,?)',
          )
          .bind(
            u.id,
            u.tenant_id,
            email,
            u.name,
            await passwordHash(b.password),
            'Admin',
          ),
        audit(u, 'Created', 'users', u.id, 'Administrator account created'),
      ]);
      return session(u, false, req);
    }
    if (path === 'login' && req.method === 'POST') {
      const email = String(b.email || '')
        .trim()
        .toLowerCase();
      const attempts = await db()
        .prepare('SELECT * FROM login_attempts WHERE email=?')
        .bind(email)
        .first<any>();
      if (attempts && attempts.reset > Date.now() && attempts.count >= 5)
        return json(
          { error: 'Too many attempts. Try again in 15 minutes.' },
          429,
        );
      const u = await db()
        .prepare(
          'SELECT u.*,t.name company FROM users u JOIN tenants t ON t.id=u.tenant_id WHERE email=?',
        )
        .bind(email)
        .first<any>();
      const candidate = await passwordHash(
        String(b.password || ''),
        u?.password.split(':')[0] || 'unknown-account',
      );
      if (!u || !safeEqual(candidate, u.password) || !u.active) {
        await db()
          .prepare(
            'INSERT INTO login_attempts VALUES (?,1,?) ON CONFLICT(email) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END,reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END',
          )
          .bind(email, Date.now() + 900000, Date.now(), Date.now())
          .run();
        return json({ error: 'Invalid username or password.' }, 401);
      }
      await db()
        .prepare('DELETE FROM login_attempts WHERE email=?')
        .bind(email)
        .run();
      delete u.password;
      return session(u, !!b.remember, req);
    }
    const u = await authenticate(req);
    if (!u)
      return json(
        { error: 'Your session has expired. Please sign in again.' },
        401,
      );
    if (path.startsWith('sales/'))
      return await sales(req, path, b, u, db(), (env as any).FILES);
    if (path.startsWith('operations/'))
      return await operations(req, path, b, u, db(), (env as any).FILES);
    if (path === 'me') return json({ user: u });
    if (path === 'logout' && req.method === 'POST') {
      const token =
        (req.headers.get('Cookie') || '').match(/erp_session=([^;]+)/)?.[1] ||
        '';
      await db()
        .prepare('DELETE FROM sessions WHERE token=?')
        .bind(await digest(token))
        .run();
      return json({ ok: true }, 200, {
        'Set-Cookie':
          'erp_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
      });
    }
    if (path === 'password' && req.method === 'POST') {
      if (
        typeof b.password !== 'string' ||
        b.password.length < 12 ||
        b.password.length > 200
      )
        throw new Error('Use a password of 12–200 characters.');
      const old = await db()
        .prepare('SELECT password FROM users WHERE id=?')
        .bind(u.id)
        .first<any>();
      if (
        !safeEqual(
          await passwordHash(
            String(b.current || ''),
            old.password.split(':')[0],
          ),
          old.password,
        )
      )
        throw new Error('Current password is incorrect.');
      await db().batch([
        db()
          .prepare('UPDATE users SET password=? WHERE id=?')
          .bind(await passwordHash(b.password), u.id),
        db().prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id),
        audit(
          u,
          'Updated',
          'users',
          u.id,
          'Password changed; all sessions revoked',
        ),
      ]);
      return json({ ok: true });
    }
    if (path === 'preferences') {
      if (req.method === 'GET') {
        const p = await db()
          .prepare('SELECT data FROM preferences WHERE user_id=?')
          .bind(u.id)
          .first<any>();
        return json(p ? JSON.parse(p.data) : {});
      }
      if (req.method === 'POST') {
        const p = {
          fy: String(b.fy || '2026–27'),
          period: String(b.period || 'This financial year'),
        };
        await db()
          .prepare(
            'INSERT INTO preferences VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data',
          )
          .bind(u.id, JSON.stringify(p))
          .run();
        return json(p);
      }
    }
    if (path === 'users' && req.method === 'GET') {
      if (u.role !== 'Admin')
        return json({ error: 'Administrator access required.' }, 403);
      return json(
        (
          await db()
            .prepare(
              'SELECT id,name,email,role,active FROM users WHERE tenant_id=?',
            )
            .bind(u.tenant_id)
            .all()
        ).results,
      );
    }
    if (path === 'users' && req.method === 'POST') {
      if (u.role !== 'Admin')
        return json({ error: 'Administrator access required.' }, 403);
      const role = text(b.role, 'Role');
      if (!permissions[role]) throw new Error('Invalid role.');
      const email = text(b.email, 'Email').toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Enter a valid email.');
      if (
        typeof b.password !== 'string' ||
        b.password.length < 12 ||
        b.password.length > 200
      )
        throw new Error('Use a password of 12–200 characters.');
      const uid = id();
      await db().batch([
        db()
          .prepare(
            'INSERT INTO users(id,tenant_id,email,name,password,role) VALUES (?,?,?,?,?,?)',
          )
          .bind(
            uid,
            u.tenant_id,
            email,
            text(b.name, 'Name'),
            await passwordHash(b.password),
            role,
          ),
        audit(u, 'Created', 'users', uid, `User ${email} (${role})`),
      ]);
      return json({ id: uid }, 201);
    }
    if (path === 'activity' && req.method === 'GET') {
      return json(
        (
          await db()
            .prepare(
              'SELECT a.*,u.name actor FROM audit a LEFT JOIN users u ON u.id=a.user_id WHERE a.tenant_id=? ORDER BY a.created DESC LIMIT 100',
            )
            .bind(u.tenant_id)
            .all()
        ).results
          .filter(
            (r: any) =>
              u.role === 'Admin' || permissions[u.role]?.includes(r.kind),
          )
          .map((r: any) =>
            u.role === 'Viewer'
              ? { ...r, detail: 'Details restricted to authorised editors.' }
              : r,
          ),
      );
    }
    if (path === 'notifications' && req.method === 'GET') {
      const all = await records(
        u.tenant_id,
        url.searchParams.get('fy') || undefined,
      );
      const read = (
        await db()
          .prepare('SELECT record_id FROM notification_reads WHERE user_id=?')
          .bind(u.id)
          .all()
      ).results.map((r: any) => r.record_id);
      return json(
        all
          .filter((r) => r.kind === 'exceptions' && r.status !== 'Resolved')
          .map((r) => ({ ...r, read: read.includes(r.id) })),
      );
    }
    if (path === 'notifications/read' && req.method === 'POST') {
      const all = await records(u.tenant_id);
      const statements = all
        .filter((r) => r.kind === 'exceptions')
        .map((r) =>
          db()
            .prepare('INSERT OR IGNORE INTO notification_reads VALUES (?,?)')
            .bind(u.id, r.id),
        );
      if (statements.length) await db().batch(statements);
      return json({ ok: true });
    }
    if (path === 'masters' && req.method === 'GET')
      return json(permittedMasters(u.role));
    if (path.startsWith('masters/') && req.method === 'GET') {
      const item = masterItems.find((i) => i.key === path.slice(8));
      if (!item || !item.roles.includes(u.role))
        return json({ error: 'Master not found or access unavailable.' }, 404);
      return json(item);
    }
    const allowed = [
      ...(permissions[u.role] || []),
      ...Object.values(opMap)
        .filter((m) => permittedOperation(m, u.role))
        .map((m) => m.key),
    ];
    if (path === 'dashboard' && req.method === 'GET') {
      const fy = url.searchParams.get('fy') || '2026–27';
      const start = validDate(url.searchParams.get('start'));
      const end = validDate(url.searchParams.get('end'));
      if (start > end) throw new Error('Start date must be before end date.');
      const all = await records(u.tenant_id);
      const scoped = all.filter(
        (r) =>
          masterKinds.includes(r.kind) ||
          r.fy === fy ||
          [
            'journal',
            'invoices',
            'bills',
            'domestic-invoices',
            'purchase-invoices',
            'expenses',
            'receipts',
            'payments',
          ].includes(r.kind),
      );
      const result = dashboard(
        scoped.filter((r) => allowed.includes(r.kind)),
        start,
        end,
      );
      if (u.role === 'Logistics') {
        result.totals = [];
        result.trend = [];
        result.receivables = [];
        result.payables = [];
      }
      return json(result);
    }
    if (path === 'records' && req.method === 'GET') {
      const all = await records(
        u.tenant_id,
        url.searchParams.get('fy') || undefined,
      );
      return json(
        all
          .filter((r) => allowed.includes(r.kind))
          .map((r) => safeRecord(r, u)),
      );
    }
    if (path === 'search' && req.method === 'GET') {
      const q = (url.searchParams.get('q') || '').toLowerCase().slice(0, 150);
      if (!q) return json([]);
      return json(
        (await records(u.tenant_id, url.searchParams.get('fy') || undefined))
          .filter(
            (r) =>
              allowed.includes(r.kind) &&
              (!url.searchParams.get('fy') ||
                masterKinds.includes(r.kind) ||
                r.fy === url.searchParams.get('fy')) &&
              [r.name, r.reference, r.sku, r.destination].some((x) =>
                String(x || '')
                  .toLowerCase()
                  .includes(q),
              ),
          )
          .slice(0, 40)
          .map((r) => safeRecord(r, u)),
      );
    }
    const m = path.match(
      /^records\/([^/]+)(?:\/([^/]+))?(?:\/(post|status))?$/,
    );
    if (m) {
      const [, kind, rid, action] = m;
      if (!kinds.includes(kind as any))
        return json({ error: 'Unknown record type.' }, 404);
      if (!allowed.includes(kind) || u.role === 'Viewer')
        return json(
          { error: 'You do not have permission to change these records.' },
          403,
        );
      if (req.method === 'POST' && !rid) {
        const d = await validate(kind, b, u),
          record = id();
        if (kind === 'movements') {
          if (
            await db()
              .prepare(
                'SELECT 1 FROM stock_balances WHERE tenant_id=? AND product_id=? LIMIT 1',
              )
              .bind(u.tenant_id, d.productId)
              .first()
          )
            throw new Error(
              'Use Stock Adjustment or Stock Transfer for valued inventory.',
            );
          // One conditional INSERT makes issue validation atomic across concurrent requests.
          const qty = d.direction === 'Issue' ? -d.quantity : d.quantity;
          const statement = db()
            .prepare(
              `INSERT INTO records(id,tenant_id,kind,fy,data,created) SELECT ?,?,'movements',?,?,? WHERE ? >= 0 OR COALESCE((SELECT SUM(CASE json_extract(data,'$.direction') WHEN 'Receipt' THEN json_extract(data,'$.quantity') ELSE -json_extract(data,'$.quantity') END) FROM records WHERE tenant_id=? AND kind='movements' AND json_extract(data,'$.productId')=? AND json_extract(data,'$.warehouseId')=?),0) >= -?`,
            )
            .bind(
              record,
              u.tenant_id,
              fiscalYear(d.date),
              JSON.stringify(d),
              now(),
              qty,
              u.tenant_id,
              d.productId,
              d.warehouseId,
              qty,
            );
          const result = await db().batch([
            statement,
            db()
              .prepare(
                'INSERT INTO audit SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND tenant_id=?)',
              )
              .bind(
                id(),
                u.tenant_id,
                u.id,
                'Created',
                record,
                kind,
                d.reference,
                now(),
                record,
                u.tenant_id,
              ),
          ]);
          if (!result[0].meta.changes)
            throw new Error('Insufficient stock in this warehouse.');
        } else {
          await db().batch([
            insert(u, kind, d, record),
            audit(u, 'Created', kind, record, d.name || d.reference),
          ]);
        }
        return json({ id: record }, 201);
      }
      const raw = await db()
        .prepare('SELECT * FROM records WHERE id=? AND tenant_id=? AND kind=?')
        .bind(rid || '', u.tenant_id, kind)
        .first<any>();
      if (!raw) return json({ error: 'Record not found.' }, 404);
      const r = decode(raw);
      if (r.operation && req.method !== 'GET')
        return json(
          { error: 'Use the document workspace to change this record.' },
          409,
        );
      if (
        req.method === 'POST' &&
        action === 'post' &&
        ['invoices', 'bills'].includes(kind)
      ) {
        if (r.status !== 'Draft')
          return json({ error: 'This document has already been posted.' }, 409);
        const lines =
          kind === 'invoices'
            ? [
                { account: '1100', debit: r.amount, credit: 0 },
                { account: '4000', debit: 0, credit: r.amount },
              ]
            : [
                { account: '6000', debit: r.amount, credit: 0 },
                { account: '2000', debit: 0, credit: r.amount },
              ];
        assertBalanced(lines);
        const j = {
          date: r.date,
          reference: r.reference,
          currency: r.currency,
          status: 'Posted',
          memo: `${kind === 'invoices' ? 'Invoice' : 'Expense bill'} ${r.reference}`,
          lines,
          sourceId: r.id,
        };
        // Deterministic journal id prevents a duplicate post even if requests race.
        await db().batch([
          insert(u, 'journal', j, `${r.id}-posting`),
          db()
            .prepare(
              'UPDATE records SET data=?,version=version+1 WHERE id=? AND tenant_id=?',
            )
            .bind(
              JSON.stringify({ ...JSON.parse(raw.data), status: 'Posted' }),
              r.id,
              u.tenant_id,
            ),
          audit(
            u,
            'Posted',
            kind,
            r.id,
            `${r.reference} posted to general ledger`,
          ),
        ]);
        return json({ ok: true });
      }
      if (
        req.method === 'POST' &&
        action === 'status' &&
        ['orders', 'purchase-orders', 'exceptions', 'tasks'].includes(kind)
      ) {
        const states: Record<string, string[]> = {
          orders: [
            'Draft',
            'Confirmed',
            'In Transit',
            'Delayed',
            'Pending Action',
            'Completed',
            'Cancelled',
          ],
          'purchase-orders': ['Draft', 'Confirmed', 'Received', 'Cancelled'],
          exceptions: ['Open', 'Resolved'],
          tasks: ['Open', 'In Progress', 'Completed'],
        };
        if (!states[kind].includes(b.status))
          throw new Error('Invalid status.');
        const d = { ...JSON.parse(raw.data), status: b.status };
        if (kind === 'orders') {
          d.stage = Number(b.stage === undefined ? r.stage : b.stage);
          if (
            !Number.isInteger(d.stage) ||
            d.stage < 1 ||
            d.stage > r.totalStages
          )
            throw new Error('Stage must be within the configured stage count.');
          d.stageName = text(
            b.stageName === undefined ? r.stageName : b.stageName,
            'Stage name',
          );
        }
        if (Number(b.version) !== r.version)
          return json({ error: 'Record changed. Refresh before saving.' }, 409);
        const changed = await db().batch([
          db()
            .prepare(
              'UPDATE records SET data=?,version=version+1 WHERE id=? AND tenant_id=? AND version=?',
            )
            .bind(JSON.stringify(d), r.id, u.tenant_id, r.version),
          db()
            .prepare(
              'INSERT INTO audit SELECT ?,?,?,?,?,?,?,? WHERE changes()=1',
            )
            .bind(
              id(),
              u.tenant_id,
              u.id,
              'Updated',
              r.id,
              kind,
              `${r.reference}: ${b.status}`,
              now(),
            ),
        ]);
        if (!changed[0].meta.changes)
          return json({ error: 'Record changed. Refresh before saving.' }, 409);
        return json({ ok: true });
      }
    }
    return json({ error: 'Endpoint not found.' }, 404);
  } catch (e: any) {
    const message = String(e.message || 'Request failed.');
    if (/UNIQUE constraint/.test(message))
      return json(
        {
          error:
            'This record already exists or the action was already completed.',
        },
        409,
      );
    if (/D1_|SQLITE|database|syntax error/i.test(message)) {
      console.error('ERP database error', message);
      return json({ error: 'Unable to save or load data. Please retry.' }, 500);
    }
    return json({ error: message }, 400);
  }
}
