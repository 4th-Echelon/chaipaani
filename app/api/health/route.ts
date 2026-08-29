import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, rowsOf } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/** Reports whether the database is reachable. Never exposes the connection string. */
export async function GET() {
  const started = Date.now();
  try {
    const db = await getDb();
    const rows = rowsOf<{ n: number }>(await db.execute(sql`SELECT count(*)::int AS n FROM departments`));
    return NextResponse.json({
      ok: true,
      driver: process.env.DATABASE_URL ? "postgres" : "pglite",
      departments: rows[0]?.n ?? 0,
      ms: Date.now() - started,
    });
  } catch (err) {
    const e = err as Error & { cause?: Error & { code?: string } };
    return NextResponse.json(
      {
        ok: false,
        driver: process.env.DATABASE_URL ? "postgres" : "pglite",
        error: e.message,
        cause: e.cause ? { message: e.cause.message, code: e.cause.code } : undefined,
        ms: Date.now() - started,
      },
      { status: 503 },
    );
  }
}
