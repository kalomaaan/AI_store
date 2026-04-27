# AI Store

Offline-first sales + inventory app for a single store, single user. Android-first (Expo / React Native), runs entirely on-device with SQLite.

## Stack
- Expo SDK 54 + Expo Router (file-based nav)
- TypeScript, Zustand, Drizzle ORM
- expo-sqlite (offline DB, WAL mode)
- expo-camera (barcode + QR scan)

## Features
- **Home dashboard** — today's revenue/profit, cash drawer, utang, low-stock badges
- **Scan-add** — barcode scan adds to cart or routes to product create when unknown
- **Inventory** — products with cost/price/margin/stock/unit/low-stock threshold, favorites, edit, receive/adjust/waste movements
- **New Sale** — search, scan, favorites grid, custom item, cash / credit (utang) / mixed payment
- **Customer utang** — per-customer ledger, payments roll into cash drawer
- **Merchant loans** — borrow / pay merchants, mirrored ledger, cash drawer entries
- **Cash drawer** — opening float, expenses, deposits, withdraws, full session log
- **End of day** — count cash, variance reported, session closed
- **Today report** — revenue, profit, margin, COGS, top sellers, low-stock list

## Run

Requires Node 18+ (20 recommended). `nvm use 20` first.

```sh
npm install --legacy-peer-deps
npx expo start
```

Press `a` to open on a connected Android device (USB debugging) or emulator. Build APK with EAS:

```sh
npx eas-cli build --platform android --profile preview
```

## Layout
```
app/                 expo-router routes
  _layout.tsx        root stack
  index.tsx          home dashboard
  sale/              new sale + checkout
  scanner.tsx        camera barcode scan
  inventory/         list, detail, new
  customers/         list, detail (utang ledger)
  merchants/         list, detail (loan ledger)
  cash/              drawer, end-of-day close
  reports/today.tsx  daily summary
src/
  db/                drizzle schema + bootstrap + repos
  stores/            zustand stores (cart, app)
  components/        Screen, Card, Button, Field, Tile
  lib/               format helpers (money/dates)
  theme/             colors, spacing, font
```

## Money model
All money is stored as **integer cents** to avoid float drift. Helpers in `src/lib/format.ts`.
