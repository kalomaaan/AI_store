import { and, asc, eq, ne } from 'drizzle-orm';
import { db, schema } from '../index';
import type { ProductPhoto } from '../schema';

const { productPhotos } = schema;

export async function listPhotos(productId: number): Promise<ProductPhoto[]> {
  return db
    .select()
    .from(productPhotos)
    .where(eq(productPhotos.productId, productId))
    .orderBy(asc(productPhotos.isPrimary), asc(productPhotos.id));
}

export async function primaryPhoto(productId: number): Promise<ProductPhoto | undefined> {
  const [row] = await db
    .select()
    .from(productPhotos)
    .where(and(eq(productPhotos.productId, productId), eq(productPhotos.isPrimary, true)))
    .limit(1);
  if (row) return row;
  const [first] = await db
    .select()
    .from(productPhotos)
    .where(eq(productPhotos.productId, productId))
    .orderBy(asc(productPhotos.id))
    .limit(1);
  return first;
}

export async function listAllPrimaryPhotos() {
  // Returns rows for use in visual-pick grids
  return db.select().from(productPhotos);
}

export async function addPhoto(input: {
  productId: number;
  uri: string;
  thumbUri?: string;
  width?: number;
  height?: number;
  isPrimary?: boolean;
}) {
  if (input.isPrimary) {
    await db
      .update(productPhotos)
      .set({ isPrimary: false })
      .where(eq(productPhotos.productId, input.productId));
  }
  const [row] = await db
    .insert(productPhotos)
    .values({
      productId: input.productId,
      uri: input.uri,
      thumbUri: input.thumbUri ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      isPrimary: input.isPrimary ?? false,
    })
    .returning();
  // If this is the first photo, force isPrimary = true
  const all = await listPhotos(input.productId);
  if (all.length === 1 && !row.isPrimary) {
    await db.update(productPhotos).set({ isPrimary: true }).where(eq(productPhotos.id, row.id));
    return { ...row, isPrimary: true };
  }
  return row;
}

export async function setPrimary(photoId: number) {
  const [row] = await db.select().from(productPhotos).where(eq(productPhotos.id, photoId));
  if (!row) return;
  await db
    .update(productPhotos)
    .set({ isPrimary: false })
    .where(and(eq(productPhotos.productId, row.productId), ne(productPhotos.id, photoId)));
  await db.update(productPhotos).set({ isPrimary: true }).where(eq(productPhotos.id, photoId));
}

export async function deletePhoto(photoId: number) {
  await db.delete(productPhotos).where(eq(productPhotos.id, photoId));
}
