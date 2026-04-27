import Fuse from 'fuse.js';
import type { ProductWithPhoto } from '@/db/repo/products';

export type Match = {
  product: ProductWithPhoto;
  score: number;       // 0..1, higher = better
  matchedLine: string;
};

const MIN_SCORE = 0.45;

export function matchProductsFromOcr(
  candidates: string[],
  products: ProductWithPhoto[]
): Match[] {
  if (candidates.length === 0 || products.length === 0) return [];
  const fuse = new Fuse(products, {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'category', weight: 0.15 },
      { name: 'sku', weight: 0.075 },
      { name: 'barcode', weight: 0.075 },
    ],
    includeScore: true,
    threshold: 0.55,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });

  const byId = new Map<number, Match>();
  for (const cand of candidates) {
    const results = fuse.search(cand);
    for (const r of results) {
      const score = 1 - (r.score ?? 1); // fuse score: 0 = perfect, 1 = bad
      if (score < MIN_SCORE) continue;
      const cur = byId.get(r.item.id);
      if (!cur || score > cur.score) {
        byId.set(r.item.id, { product: r.item, score, matchedLine: cand });
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, 5);
}
