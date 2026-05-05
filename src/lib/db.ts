import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

export type DbRow = Record<string, string | number | bigint | null>;
export type RunResult = { rowsAffected: number; lastInsertRowid: number | bigint };

export interface Db {
  all<T = DbRow>(sql: string, args?: (string | number | bigint | null)[]): Promise<T[]>;
  get<T = DbRow>(sql: string, args?: (string | number | bigint | null)[]): Promise<T | undefined>;
  run(sql: string, args?: (string | number | bigint | null)[]): Promise<RunResult>;
}

let instance: Db | null = null;

function createLocalDb(): Db {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
  const dataDir = path.join(process.cwd(), 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const sqlite = new DatabaseSync(path.join(dataDir, 'dca.db'));
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const schema = readFileSync(path.join(process.cwd(), 'src/lib/schema.sql'), 'utf8');
  sqlite.exec(schema);
  return {
    all: async (sql, args = []) => sqlite.prepare(sql).all(...args) as never,
    get: async (sql, args = []) => sqlite.prepare(sql).get(...args) as never,
    run: async (sql, args = []) => {
      const r = sqlite.prepare(sql).run(...args) as { changes: number; lastInsertRowid: number };
      return { rowsAffected: r.changes, lastInsertRowid: r.lastInsertRowid };
    },
  };
}

async function createTursoDb(): Promise<Db> {
  const { createClient } = await import('@libsql/client');
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const schema = readFileSync(path.join(process.cwd(), 'src/lib/schema.sql'), 'utf8');
  await client.executeMultiple(schema);
  return {
    all: async (sql, args = []) => {
      const r = await client.execute({ sql, args: args as never[] });
      return r.rows as never;
    },
    get: async (sql, args = []) => {
      const r = await client.execute({ sql, args: args as never[] });
      return r.rows[0] as never;
    },
    run: async (sql, args = []) => {
      const r = await client.execute({ sql, args: args as never[] });
      return { rowsAffected: r.rowsAffected, lastInsertRowid: r.lastInsertRowid ?? 0n };
    },
  };
}

export async function getDb(): Promise<Db> {
  if (instance) return instance;
  instance = process.env.TURSO_DATABASE_URL
    ? await createTursoDb()
    : createLocalDb();
  return instance;
}
