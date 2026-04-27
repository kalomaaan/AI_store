import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// All money is stored as integer cents. All dates as ISO strings.

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sku: text('sku'),
    barcode: text('barcode'),
    name: text('name').notNull(),
    category: text('category'),
    unit: text('unit').default('pc').notNull(),
    cost: integer('cost').default(0).notNull(),
    price: integer('price').default(0).notNull(),
    stock: real('stock').default(0).notNull(),
    lowStock: real('low_stock').default(5).notNull(),
    imagePath: text('image_path'),
    favorite: integer('favorite', { mode: 'boolean' }).default(false).notNull(),
    archived: integer('archived', { mode: 'boolean' }).default(false).notNull(),
    createdAt: text('created_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: text('updated_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  (t) => ({
    barcodeIdx: index('products_barcode_idx').on(t.barcode),
    nameIdx: index('products_name_idx').on(t.name),
  })
);

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  type: text('type', { enum: ['receive', 'sale', 'adjust', 'return', 'waste'] }).notNull(),
  qty: real('qty').notNull(),
  unitCost: integer('unit_cost').default(0).notNull(),
  refTable: text('ref_table'),
  refId: integer('ref_id'),
  note: text('note'),
  occurredAt: text('occurred_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  note: text('note'),
  balance: integer('balance').default(0).notNull(), // cents owed by customer (positive = utang)
  createdAt: text('created_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export const merchants = sqliteTable('merchants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  contact: text('contact'),
  note: text('note'),
  balance: integer('balance').default(0).notNull(), // cents owed by store to merchant
  createdAt: text('created_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export const sales = sqliteTable(
  'sales',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    total: integer('total').notNull(),
    discount: integer('discount').default(0).notNull(),
    paid: integer('paid').default(0).notNull(),
    method: text('method', { enum: ['cash', 'credit', 'mixed'] }).notNull(),
    customerId: integer('customer_id').references(() => customers.id),
    note: text('note'),
    occurredAt: text('occurred_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  (t) => ({
    saleDateIdx: index('sales_date_idx').on(t.occurredAt),
  })
);

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id')
    .references(() => sales.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id').references(() => products.id),
  name: text('name').notNull(), // snapshot
  qty: real('qty').notNull(),
  unitPrice: integer('unit_price').notNull(),
  unitCost: integer('unit_cost').default(0).notNull(),
  lineTotal: integer('line_total').notNull(),
});

export const customerLedger = sqliteTable('customer_ledger', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id')
    .references(() => customers.id)
    .notNull(),
  saleId: integer('sale_id').references(() => sales.id),
  type: text('type', { enum: ['charge', 'payment', 'adjust'] }).notNull(),
  amount: integer('amount').notNull(), // cents; charge positive, payment negative
  note: text('note'),
  occurredAt: text('occurred_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export const merchantLedger = sqliteTable('merchant_ledger', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  merchantId: integer('merchant_id')
    .references(() => merchants.id)
    .notNull(),
  type: text('type', { enum: ['borrow', 'payment', 'adjust']  }).notNull(),
  amount: integer('amount').notNull(), // cents; borrow positive (we owe more), payment negative
  note: text('note'),
  occurredAt: text('occurred_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export const cashSessions = sqliteTable('cash_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  openingFloat: integer('opening_float').default(0).notNull(),
  closingCounted: integer('closing_counted'),
  expected: integer('expected'),
  variance: integer('variance'),
  note: text('note'),
});

export const cashMovements = sqliteTable(
  'cash_movements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id').references(() => cashSessions.id),
    type: text('type', {
      enum: [
        'opening_float',
        'sale',
        'credit_payment',
        'merchant_payment',
        'merchant_borrow',
        'expense',
        'deposit',
        'withdraw',
        'adjust',
      ],
    }).notNull(),
    amount: integer('amount').notNull(), // signed cents (+ in, - out)
    refTable: text('ref_table'),
    refId: integer('ref_id'),
    note: text('note'),
    occurredAt: text('occurred_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  (t) => ({
    sessionIdx: index('cash_movements_session_idx').on(t.sessionId),
    dateIdx: index('cash_movements_date_idx').on(t.occurredAt),
  })
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Merchant = typeof merchants.$inferSelect;
export type CashMovement = typeof cashMovements.$inferSelect;
export type CashSession = typeof cashSessions.$inferSelect;
