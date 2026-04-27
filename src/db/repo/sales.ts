import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { db, schema } from '../index';

const {
  products,
  sales,
  saleItems,
  stockMovements,
  customers,
  customerLedger,
  cashMovements,
} = schema;

export type CartLine = {
  productId: number | null;
  name: string;
  qty: number;
  unitPrice: number; // cents
  unitCost: number; // cents
};

export type CheckoutInput = {
  lines: CartLine[];
  discount?: number;
  paid: number;
  method: 'cash' | 'credit' | 'mixed';
  customerId?: number | null;
  sessionId?: number | null;
  note?: string;
};

export async function checkout(input: CheckoutInput): Promise<number> {
  if (input.lines.length === 0) throw new Error('Cart empty');

  const subtotal = input.lines.reduce((s, l) => s + Math.round(l.qty * l.unitPrice), 0);
  const discount = input.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  if (input.method === 'credit' && !input.customerId) {
    throw new Error('Credit sale requires customer');
  }

  let saleId = 0;
  await db.transaction(async (tx) => {
    const [saleRow] = await tx
      .insert(sales)
      .values({
        total,
        discount,
        paid: input.paid,
        method: input.method,
        customerId: input.customerId ?? null,
        note: input.note ?? null,
      })
      .returning({ id: sales.id });
    saleId = saleRow.id;

    for (const l of input.lines) {
      await tx.insert(saleItems).values({
        saleId,
        productId: l.productId,
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
        unitCost: l.unitCost,
        lineTotal: Math.round(l.qty * l.unitPrice),
      });

      if (l.productId != null) {
        await tx.insert(stockMovements).values({
          productId: l.productId,
          type: 'sale',
          qty: -l.qty,
          unitCost: l.unitCost,
          refTable: 'sales',
          refId: saleId,
        });
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${l.qty}` })
          .where(eq(products.id, l.productId));
      }
    }

    if (input.paid > 0) {
      await tx.insert(cashMovements).values({
        sessionId: input.sessionId ?? null,
        type: 'sale',
        amount: input.paid,
        refTable: 'sales',
        refId: saleId,
      });
    }

    const owed = total - input.paid;
    if (owed > 0) {
      if (!input.customerId) throw new Error('Unpaid amount requires customer');
      await tx.insert(customerLedger).values({
        customerId: input.customerId,
        saleId,
        type: 'charge',
        amount: owed,
        note: 'Sale on credit',
      });
      await tx
        .update(customers)
        .set({ balance: sql`${customers.balance} + ${owed}` })
        .where(eq(customers.id, input.customerId));
    }
  });

  return saleId;
}

export async function listSales(opts: { from?: string; to?: string; limit?: number } = {}) {
  const where = [];
  if (opts.from) where.push(gte(sales.occurredAt, opts.from));
  if (opts.to) where.push(lt(sales.occurredAt, opts.to));
  const q = db
    .select()
    .from(sales)
    .orderBy(desc(sales.occurredAt))
    .limit(opts.limit ?? 200);
  return where.length ? q.where(and(...where)) : q;
}

export async function saleDetail(saleId: number) {
  const [sale] = await db.select().from(sales).where(eq(sales.id, saleId));
  if (!sale) return null;
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  return { sale, items };
}

export async function dailySummary(dateIso: string) {
  const dayStart = dateIso.slice(0, 10) + 'T00:00:00';
  const dayEnd = dateIso.slice(0, 10) + 'T23:59:59';
  const rows = await db
    .select()
    .from(sales)
    .where(and(gte(sales.occurredAt, dayStart), lt(sales.occurredAt, dayEnd)));
  const itemRows = await db
    .select({
      saleId: saleItems.saleId,
      qty: saleItems.qty,
      unitPrice: saleItems.unitPrice,
      unitCost: saleItems.unitCost,
      name: saleItems.name,
    })
    .from(saleItems)
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .where(and(gte(sales.occurredAt, dayStart), lt(sales.occurredAt, dayEnd)));

  const revenue = rows.reduce((s, r) => s + r.total, 0);
  const cogs = itemRows.reduce((s, r) => s + Math.round(r.qty * r.unitCost), 0);
  const grossSales = itemRows.reduce((s, r) => s + Math.round(r.qty * r.unitPrice), 0);
  const profit = revenue - cogs;

  const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const r of itemRows) {
    const cur = byProduct.get(r.name) ?? { name: r.name, qty: 0, revenue: 0 };
    cur.qty += r.qty;
    cur.revenue += Math.round(r.qty * r.unitPrice);
    byProduct.set(r.name, cur);
  }
  const top = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return {
    sales: rows.length,
    revenue,
    grossSales,
    cogs,
    profit,
    top,
  };
}
