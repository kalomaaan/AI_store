import { create } from 'zustand';
import { initDb } from '@/db';
import { setCurrency } from '@/lib/format';
import { getAllSettings } from '@/db/repo/settings';
import { currentSession, openSession } from '@/db/repo/cash';
import type { CashSession } from '@/db/schema';

type AppState = {
  ready: boolean;
  storeName: string;
  currencySymbol: string;
  lowStockDefault: number;
  session: CashSession | null;
  refreshSession: () => Promise<void>;
  ensureSession: () => Promise<CashSession>;
  init: () => Promise<void>;
  applySettings: (kv: Record<string, string>) => void;
};

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  storeName: 'My Store',
  currencySymbol: '₱',
  lowStockDefault: 5,
  session: null,
  applySettings: (kv) => {
    const sym = kv.currencySymbol || '₱';
    setCurrency(sym);
    set({
      storeName: kv.storeName || 'My Store',
      currencySymbol: sym,
      lowStockDefault: parseFloat(kv.lowStockDefault ?? '5') || 5,
    });
  },
  refreshSession: async () => {
    const s = await currentSession();
    set({ session: s ?? null });
  },
  ensureSession: async () => {
    const cur = get().session ?? (await currentSession());
    if (cur) {
      set({ session: cur });
      return cur;
    }
    const fresh = await openSession(0);
    set({ session: fresh });
    return fresh;
  },
  init: async () => {
    await initDb();
    const kv = await getAllSettings();
    get().applySettings(kv);
    await get().refreshSession();
    set({ ready: true });
  },
}));
