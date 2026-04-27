import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { db, schema } from '../index';

const { cashSessions, cashMovements } = schema;

export async function currentSession() {
  const [s] = await db
    .select()
    .from(cashSessions)
    .where(isNull(cashSessions.closedAt))
    .orderBy(desc(cashSessions.openedAt))
    .limit(1);
  return s;
}

export async function openSession(openingFloat: number) {
  const open = await currentSession();
  if (open) return open;
  const [s] = await db
    .insert(cashSessions)
    .values({ openedAt: new Date().toISOString(), openingFloat })
    .returning();
  if (openingFloat > 0) {
    await db.insert(cashMovements).values({
      sessionId: s.id,
      type: 'opening_float',
      amount: openingFloat,
      note: 'Opening float',
    });
  }
  return s;
}

export async function sessionMovements(sessionId: number) {
  return db
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.sessionId, sessionId))
    .orderBy(desc(cashMovements.occurredAt));
}

export async function expectedCash(sessionId: number): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${cashMovements.amount}), 0)` })
    .from(cashMovements)
    .where(eq(cashMovements.sessionId, sessionId));
  return rows[0]?.total ?? 0;
}

export async function closeSession(sessionId: number, counted: number, note?: string) {
  const expected = await expectedCash(sessionId);
  const variance = counted - expected;
  await db
    .update(cashSessions)
    .set({
      closedAt: new Date().toISOString(),
      closingCounted: counted,
      expected,
      variance,
      note: note ?? null,
    })
    .where(eq(cashSessions.id, sessionId));
  return { expected, counted, variance };
}

export async function recordExpense(
  amount: number,
  note: string,
  sessionId?: number | null
) {
  await db.insert(cashMovements).values({
    sessionId: sessionId ?? null,
    type: 'expense',
    amount: -amount,
    note,
  });
}

export async function recordDeposit(
  amount: number,
  note: string,
  sessionId?: number | null
) {
  await db.insert(cashMovements).values({
    sessionId: sessionId ?? null,
    type: 'deposit',
    amount,
    note,
  });
}

export async function recordWithdraw(
  amount: number,
  note: string,
  sessionId?: number | null
) {
  await db.insert(cashMovements).values({
    sessionId: sessionId ?? null,
    type: 'withdraw',
    amount: -amount,
    note,
  });
}

export async function dayMovements(dateIso: string) {
  const dayStart = dateIso.slice(0, 10) + 'T00:00:00';
  const dayEnd = dateIso.slice(0, 10) + 'T23:59:59';
  return db
    .select()
    .from(cashMovements)
    .where(and(gte(cashMovements.occurredAt, dayStart), lt(cashMovements.occurredAt, dayEnd)))
    .orderBy(desc(cashMovements.occurredAt));
}
