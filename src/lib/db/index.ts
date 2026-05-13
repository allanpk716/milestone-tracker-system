import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'tracker.db');

// Ensure data directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);

// Enable WAL mode for concurrent read/write support
sqlite.pragma('journal_mode = WAL');
// Enable foreign key enforcement
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);
export default db;
