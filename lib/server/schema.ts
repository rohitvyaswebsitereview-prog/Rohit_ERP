export const schema = [
  `CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Admin', active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (email TEXT PRIMARY KEY, count INTEGER NOT NULL, reset INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), kind TEXT NOT NULL, fy TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL, UNIQUE(tenant_id,kind,id))`,
  `CREATE INDEX IF NOT EXISTS records_scope ON records(tenant_id,kind,fy)`,
  `CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, action TEXT NOT NULL, record_id TEXT, kind TEXT NOT NULL, detail TEXT NOT NULL, created TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS audit_scope ON audit(tenant_id,created)`,
  `CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit events cannot be changed'); END`,
  `CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit events cannot be deleted'); END`,
  `CREATE TABLE IF NOT EXISTS notification_reads (user_id TEXT NOT NULL, record_id TEXT NOT NULL, PRIMARY KEY(user_id,record_id))`,
  `CREATE TABLE IF NOT EXISTS preferences (user_id TEXT PRIMARY KEY, data TEXT NOT NULL)`,
];
