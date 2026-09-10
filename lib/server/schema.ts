export const schema = [
  `CREATE TABLE IF NOT EXISTS workbook_imports(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,filename TEXT NOT NULL,sha256 TEXT NOT NULL,metadata TEXT NOT NULL,original BLOB NOT NULL,created TEXT NOT NULL,UNIQUE(tenant_id,sha256))`,
  `CREATE TABLE IF NOT EXISTS workbook_sheets(batch_id TEXT NOT NULL,sheet_index INTEGER NOT NULL,name TEXT NOT NULL,metadata TEXT NOT NULL,PRIMARY KEY(batch_id,sheet_index))`,
  `CREATE TABLE IF NOT EXISTS workbook_rows(batch_id TEXT NOT NULL,sheet_index INTEGER NOT NULL,row_number INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(batch_id,sheet_index,row_number))`,
  `CREATE TABLE IF NOT EXISTS workbook_facts(id TEXT PRIMARY KEY,batch_id TEXT NOT NULL,tenant_id TEXT NOT NULL,domain TEXT NOT NULL,data TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS workbook_facts_scope ON workbook_facts(tenant_id,batch_id,domain)`,

  `CREATE TABLE IF NOT EXISTS document_sequences(id TEXT PRIMARY KEY,value INTEGER NOT NULL)`,
  // Applied after records exists; unique operational identities are defined below.

  `CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Admin', active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (email TEXT PRIMARY KEY, count INTEGER NOT NULL, reset INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), kind TEXT NOT NULL, fy TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL, UNIQUE(tenant_id,kind,id))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS operation_reference ON records(tenant_id,kind,json_extract(data,'$.reference')) WHERE json_extract(data,'$.operation')=1 AND json_extract(data,'$.reference')<>''`,
  `CREATE UNIQUE INDEX IF NOT EXISTS operation_serial ON records(tenant_id,json_extract(data,'$.serialNumber')) WHERE kind='machines'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS operation_currency ON records(tenant_id,json_extract(data,'$.code')) WHERE kind='master-currency'`,
  `CREATE INDEX IF NOT EXISTS records_scope ON records(tenant_id,kind,fy)`,
  `CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, action TEXT NOT NULL, record_id TEXT, kind TEXT NOT NULL, detail TEXT NOT NULL, created TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS audit_scope ON audit(tenant_id,created)`,
  `CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit events cannot be changed'); END`,
  `CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit events cannot be deleted'); END`,
  `CREATE TABLE IF NOT EXISTS notification_reads (user_id TEXT NOT NULL, record_id TEXT NOT NULL, PRIMARY KEY(user_id,record_id))`,
  `CREATE TABLE IF NOT EXISTS stock_balances(tenant_id TEXT NOT NULL, product_id TEXT NOT NULL,warehouse_id TEXT NOT NULL,currency TEXT NOT NULL,quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity>=0),value INTEGER NOT NULL DEFAULT 0 CHECK(value>=0),version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(tenant_id,product_id,warehouse_id,currency))`,
  `CREATE TABLE IF NOT EXISTS posting_guards(id TEXT PRIMARY KEY,expected INTEGER NOT NULL,actual INTEGER NOT NULL,CHECK(expected=actual))`,
  `CREATE TABLE IF NOT EXISTS preferences (user_id TEXT PRIMARY KEY, data TEXT NOT NULL)`,
];
