import { desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../index';

const { customers, customerLedger, merchants, merchantLedger, cashMovements } = schema;

// ---------- Customers ----------

export async function listCustomers() {
  return db.select().from(customers).orderBy(desc(customers.balance), customers.name);
}

export async function getCustomer(id: number) {
  const [c] = await db.select().from(customers).where(eq(customers.id, id));
  return c;
}

export async function createCustomer(name: string, phone?: string, note?: string) {
  const [c] = await db.insert(customers).values({ name, phone, note }).returning();
  return c;
}

export async function customerHistory(id: number) {
  return db
    .select()
    .from(customerLedger)
    .where(eq(customerLedger.customerId, id))
    .orderBy(desc(customerLedger.occurredAt));
}

export async function settleCustomer(
  customerId: number,
  amount: number,
  sessionId?: number | null,
  note?: string
) {
  await db.transaction(async (tx) => {
    await tx.insert(customerLedger).values({
      customerId,
      type: 'payment',
      amount: -amount,
      note: note ?? 'Payment received',
    });
    await tx
      .update(customers)
      .set({ balance: sql`${customers.balance} - ${amount}` })
      .where(eq(customers.id, customerId));
    await tx.insert(cashMovements).values({
      sessionId: sessionId ?? null,
      type: 'credit_payment',
      amount,
      refTable: 'customers',
      refId: customerId,
      note: note ?? null,
    });
  });
}

// ---------- Merchants ----------

export async function listMerchants() {
  return db.select().from(merchants).orderBy(desc(merchants.balance), merchants.name);
}

export async function getMerchant(id: number) {
  const [m] = await db.select().from(merchants).where(eq(merchants.id, id));
  return m;
}

export async function createMerchant(name: string, contact?: string, note?: string) {
  const [m] = await db.insert(merchants).values({ name, contact, note }).returning();
  return m;
}

export async function merchantHistory(id: number) {
  return db
    .select()
    .from(merchantLedger)
    .where(eq(merchantLedger.merchantId, id))
    .orderBy(desc(merchantLedger.occurredAt));
}

export async function borrowFromMerchant(
  merchantId: number,
  amount: number,
  sessionId?: number | null,
  note?: string
) {
  await db.transaction(async (tx) => {
    await tx.insert(merchantLedger).values({
      merchantId,
      type: 'borrow',
      amount,
      note: note ?? null,
    });
    await tx
      .update(merchants)
      .set({ balance: sql`${merchants.balance} + ${amount}` })
      .where(eq(merchants.id, merchantId));
    await tx.insert(cashMovements).values({
      sessionId: sessionId ?? null,
      type: 'merchant_borrow',
      amount,
      refTable: 'merchants',
      refId: merchantId,
      note: note ?? 'Loan from merchant',
    });
  });
}

export async function payMerchant(
  merchantId: number,
  amount: number,
  sessionId?: number | null,
  note?: string
) {
  await db.transaction(async (tx) => {
    await tx.insert(merchantLedger).values({
      merchantId,
      type: 'payment',
      amount: -amount,
      note: note ?? null,
    });
    await tx
      .update(merchants)
      .set({ balance: sql`${merchants.balance} - ${amount}` })
      .where(eq(merchants.id, merchantId));
    await tx.insert(cashMovements).values({
      sessionId: sessionId ?? null,
      type: 'merchant_payment',
      amount: -amount,
      refTable: 'merchants',
      refId: merchantId,
      note: note ?? 'Loan repayment',
    });
  });
}
