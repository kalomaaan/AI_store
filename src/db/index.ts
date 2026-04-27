import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { runMigrations } from './bootstrap';
import * as schema from './schema';

const sqlite = SQLite.openDatabaseSync('aistore.db', { useNewConnection: false });

// Pragmas — perf + safety
sqlite.execSync('PRAGMA journal_mode = WAL;');
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
export { schema };
export { sqlite as raw };

let initPromise: Promise<void> | null = null;
export function initDb(): Promise<void> {
  if (!initPromise) initPromise = runMigrations(sqlite);
  return initPromise;
}
