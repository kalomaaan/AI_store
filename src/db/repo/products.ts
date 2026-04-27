import { and, desc, eq, like, or } from 'drizzle-orm';
import { db, schema } from '../index';
import type { NewProduct, Product } from '../schema';

const { products, stockMovements } = schema;

export async function listProducts(opts?: { search?: string; favoritesOnly?: boolean }) {
  const where = [eq(products.archived, false)];
  if (opts?.favoritesOnly) where.push(eq(products.favorite, true));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    where.push(or(like(products.name, q), like(products.barcode, q), like(products.sku, q))!);
  }
  return db
    .select()
    .from(products)
    .where(and(...where))
    .orderBy(desc(products.favorite), products.name);
}

export async function getById(id: number): Promise<Product | undefined> {
  const [row] = await db.select().from(products).where(eq(products.id, id));
  return row;
}

export async function getByBarcode(code: string): Promise<Product | undefined> {
  const [row] = await db.select().from(products).where(eq(products.barcode, code));
  return row;
}

export async function createProduct(input: NewProduct & { initialStock?: number }) {
  const { initialStock, ...rest } = input;
  const [row] = await db.insert(products).values(rest).returning();
  if (initialStock && initialStock > 0) {
    await db.insert(stockMovements).values({
      productId: row.id,
      type: 'receive',
      qty: initialStock,
      unitCost: row.cost,
      note: 'Initial stock',
    });
    await db
      .update(products)
      .set({ stock: initialStock })
      .where(eq(products.id, row.id));
    return { ...row, stock: initialStock };
  }
  return row;
}

export async function updateProduct(id: number, patch: Partial<NewProduct>) {
  await db
    .update(products)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id));
}

export async function adjustStock(
  productId: number,
  delta: number,
  type: 'receive' | 'adjust' | 'waste' | 'return',
  note?: string,
  unitCost?: number
) {
  const product = await getById(productId);
  if (!product) throw new Error('Product not found');
  const newStock = product.stock + delta;
  await db.insert(stockMovements).values({
    productId,
    type,
    qty: delta,
    unitCost: unitCost ?? product.cost,
    note: note ?? null,
  });
  await db.update(products).set({ stock: newStock }).where(eq(products.id, productId));
}

export async function toggleFavorite(id: number) {
  const p = await getById(id);
  if (!p) return;
  await db.update(products).set({ favorite: !p.favorite }).where(eq(products.id, id));
}

export async function lowStockList() {
  const all = await db.select().from(products).where(eq(products.archived, false));
  return all.filter((p) => p.stock <= p.lowStock);
}
