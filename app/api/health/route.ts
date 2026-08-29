import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, rowsOf } from "@/lib/db/client";
import { store } from "@/lib/data";
import { readSnapshots, SNAPSHOT_KEYS } from "@/lib/stats/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Probe = { name: string; ms: number; ok: boolean; rows?: number; error?: string };

async function probe(name: string, fn: () => Promise<unknown>, budgetMs = 10_000): Promise<Probe> {
  const t0 = Date.now();
  try {
    const res = await Promise.race([
      fn(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`exceeded ${budgetMs} ms`)), budgetMs)),
    ]);
    const rows = Array.isArray(res) ? res.length : res && typeof res === "object" && "reports" in (res as object) ? (res as { reports: unknown[] }).reports.length : undefined;
    return { name, ms: Date.now() - t0, ok: true, rows };
  } catch (err) {
    return { name, ms: Date.now() - t0, ok: false, error: (err as Error).message };
  }
}

/** Reports whether the database is reachable; `?deep=1` times every homepage query. */
export async function GET(req: NextRequest) {
  const started = Date.now();
  const deep = req.nextUrl.searchParams.get("deep") === "1";
  try {
    const db = await getDb();
    const rows = rowsOf<{ n: number }>(await db.execute(sql`SELECT count(*)::int AS n FROM departments`));
    const base = { ok: true, driver: process.env.DATABASE_URL ? "postgres" : "pglite", departments: rows[0]?.n ?? 0 };
    if (!deep) return NextResponse.json({ ...base, ms: Date.now() - started });

    const [reports] = rowsOf<{ n: number }>(await db.execute(sql`SELECT count(*)::int AS n FROM reports`));
    // Sequential on purpose so each timing is attributable.
    const probes: Probe[] = [];
    probes.push(await probe("siteStats", () => store.siteStats()));
    probes.push(await probe("stateStats", () => store.stateStats()));
    probes.push(await probe("listReports", () => store.listReports({ limit: 5 })));
    probes.push(await probe("cityStats", () => store.cityStats(5)));
    probes.push(await probe("refusalStats", () => store.refusalStats()));
    probes.push(await probe("trending", () => store.trending(4)));
    const snaps = await readSnapshots(SNAPSHOT_KEYS, db);
    const snapshots = SNAPSHOT_KEYS.map((key) => {
      const r = snaps.find((x) => x.key === key);
      return r ? { key, ageSeconds: Math.round((Date.now() - r.updatedAt.getTime()) / 1000), computed_ms: r.computedMs } : { key, ageSeconds: null, computed_ms: null };
    });
    return NextResponse.json({ ...base, reports: reports?.n ?? 0, probes, snapshots, ms: Date.now() - started });
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
