/**
 * Database client.
 *
 *  DATABASE_URL set          -> PostgreSQL via postgres-js
 *  NODE_ENV=test             -> in-memory PGlite (fresh per process)
 *  otherwise (local dev)     -> file-backed PGlite in ./.pglite (gitignored)
 *
 * `migrate()` applies every SQL file in ./drizzle once, tracked in `_migrations`.
 * It is idempotent and safe to call on every request; the first call does the work.
 */
import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import * as schema from "./schema";

export type Db = PgDatabase<any, typeof schema>;

type Holder = {
  __cpDb?: Db;
  __cpDbReady?: Promise<Db>;
  __cpPglite?: unknown;
  __cpExec?: (sqlText: string) => Promise<void>;
};
const g = globalThis as unknown as Holder;

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** postgres-js returns an array; PGlite returns { rows }. Normalise. */
export function rowsOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const r = res as { rows?: T[] };
  return r.rows ?? [];
}

async function createDb(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(process.env.DATABASE_URL, { max: 5, prepare: false });
    g.__cpExec = async (t) => { await client.unsafe(t); };
    return drizzle(client, { schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = process.env.NODE_ENV === "test" ? undefined : process.env.PGLITE_DIR ?? path.join(process.cwd(), ".pglite");
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  g.__cpPglite = client;
  g.__cpExec = async (t) => { await client.exec(t); };
  return drizzle(client, { schema }) as unknown as Db;
}

export async function migrate(db: Db): Promise<void> {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied = new Set(rowsOf<{ name: string }>(await db.execute(sql`SELECT name FROM _migrations`)).map((r) => r.name));
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    if (applied.has(f)) continue;
    const body = readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
    // Multi-statement files must go through the driver's simple-query path.
    if (g.__cpExec) await g.__cpExec(body);
    else await db.execute(sql.raw(body));
    await db.execute(sql`INSERT INTO _migrations (name) VALUES (${f})`);
  }
}

/** Returns the singleton database, migrated. */
export function getDb(): Promise<Db> {
  if (g.__cpDb) return Promise.resolve(g.__cpDb);
  if (!g.__cpDbReady) {
    g.__cpDbReady = (async () => {
      const db = await createDb();
      await migrate(db);
      if (process.env.NODE_ENV !== "test" && process.env.SEED_ON_BOOT !== "0") {
        const { ensureSeeded } = await import("./seed");
        await ensureSeeded(db);
      }
      g.__cpDb = db;
      return db;
    })();
  }
  return g.__cpDbReady;
}

/** Test helper: drop the singleton so the next getDb() boots a fresh in-memory DB. */
export async function resetDbForTests(): Promise<void> {
  const client = g.__cpPglite as { close?: () => Promise<void> } | undefined;
  if (client?.close) await client.close();
  g.__cpDb = undefined;
  g.__cpDbReady = undefined;
  g.__cpPglite = undefined;
  g.__cpExec = undefined;
}

export { schema };
