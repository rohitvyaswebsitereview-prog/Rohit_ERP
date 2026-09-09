import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  role: text('role').notNull().default('Admin'),
  active: integer('active').notNull().default(1),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expires: integer('expires').notNull(),
});
export const loginAttempts = sqliteTable('login_attempts', {
  email: text('email').primaryKey(),
  count: integer('count').notNull(),
  reset: integer('reset').notNull(),
});
export const records = sqliteTable(
  'records',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    kind: text('kind').notNull(),
    fy: text('fy').notNull(),
    data: text('data').notNull(),
    version: integer('version').notNull().default(1),
    created: text('created').notNull(),
  },
  (t) => [
    index('records_scope').on(t.tenantId, t.kind, t.fy),
    uniqueIndex('operation_reference')
      .on(t.tenantId, t.kind, sql`json_extract(${t.data},'$.reference')`)
      .where(
        sql`json_extract(${t.data},'$.operation')=1 AND json_extract(${t.data},'$.reference')<>''`,
      ),
    uniqueIndex('operation_serial')
      .on(t.tenantId, sql`json_extract(${t.data},'$.serialNumber')`)
      .where(sql`${t.kind}='machines'`),
    uniqueIndex('operation_currency')
      .on(t.tenantId, sql`json_extract(${t.data},'$.code')`)
      .where(sql`${t.kind}='master-currency'`),
  ],
);
export const audit = sqliteTable(
  'audit',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    action: text('action').notNull(),
    recordId: text('record_id'),
    kind: text('kind').notNull(),
    detail: text('detail').notNull(),
    created: text('created').notNull(),
  },
  (t) => [index('audit_scope').on(t.tenantId, t.created)],
);
export const notificationReads = sqliteTable(
  'notification_reads',
  { userId: text('user_id').notNull(), recordId: text('record_id').notNull() },
  (t) => [primaryKey({ columns: [t.userId, t.recordId] })],
);
export const preferences = sqliteTable('preferences', {
  userId: text('user_id').primaryKey(),
  data: text('data').notNull(),
});
export const stockBalances = sqliteTable(
  'stock_balances',
  {
    tenantId: text('tenant_id').notNull(),
    productId: text('product_id').notNull(),
    warehouseId: text('warehouse_id').notNull(),
    currency: text('currency').notNull(),
    quantity: integer('quantity').notNull().default(0),
    value: integer('value').notNull().default(0),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    primaryKey({
      columns: [t.tenantId, t.productId, t.warehouseId, t.currency],
    }),
    check('stock_quantity_nonnegative', sql`${t.quantity}>=0`),
    check('stock_value_nonnegative', sql`${t.value}>=0`),
  ],
);
export const postingGuards = sqliteTable(
  'posting_guards',
  {
    id: text('id').primaryKey(),
    expected: integer('expected').notNull(),
    actual: integer('actual').notNull(),
  },
  (t) => [check('posting_version_match', sql`${t.expected}=${t.actual}`)],
);
