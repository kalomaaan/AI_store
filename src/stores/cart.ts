import { create } from 'zustand';
import type { CartLine } from '@/db/repo/sales';

type CartState = {
  lines: CartLine[];
  discount: number;
  customerId: number | null;
  add: (line: CartLine) => void;
  setQty: (idx: number, qty: number) => void;
  setPrice: (idx: number, unitPrice: number) => void;
  remove: (idx: number) => void;
  setDiscount: (v: number) => void;
  setCustomer: (id: number | null) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
};

export const useCart = create<CartState>((set, get) => ({
  lines: [],
  discount: 0,
  customerId: null,
  add: (line) =>
    set((s) => {
      // merge if same product already in cart
      if (line.productId != null) {
        const idx = s.lines.findIndex((l) => l.productId === line.productId);
        if (idx >= 0) {
          const next = [...s.lines];
          next[idx] = { ...next[idx], qty: next[idx].qty + line.qty };
          return { lines: next };
        }
      }
      return { lines: [...s.lines, line] };
    }),
  setQty: (idx, qty) =>
    set((s) => {
      const next = [...s.lines];
      if (!next[idx]) return s;
      if (qty <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], qty };
      }
      return { lines: next };
    }),
  setPrice: (idx, unitPrice) =>
    set((s) => {
      const next = [...s.lines];
      if (!next[idx]) return s;
      next[idx] = { ...next[idx], unitPrice };
      return { lines: next };
    }),
  remove: (idx) =>
    set((s) => {
      const next = [...s.lines];
      next.splice(idx, 1);
      return { lines: next };
    }),
  setDiscount: (v) => set({ discount: Math.max(0, v) }),
  setCustomer: (id) => set({ customerId: id }),
  clear: () => set({ lines: [], discount: 0, customerId: null }),
  subtotal: () => get().lines.reduce((s, l) => s + Math.round(l.qty * l.unitPrice), 0),
  total: () => Math.max(0, get().subtotal() - get().discount),
}));
