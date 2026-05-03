import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

let instance: Database.Database | null = null;

function open(): Database.Database {
  const dataDir = path.join(process.cwd(), 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const db = new Database(path.join(dataDir, 'dca.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(path.join(process.cwd(), 'src/lib/schema.sql'), 'utf8');
  db.exec(schema);

  return db;
}

export function getDb(): Database.Database {
  if (!instance) instance = open();
  return instance;
}
