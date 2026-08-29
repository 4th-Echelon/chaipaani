/** Seed taxonomy and the demo report set. Idempotent. */
import { eq, sql } from "drizzle-orm";
import { getDb, type Db } from "./client";
import { cities, departments, reports, states } from "./schema";
import { buildSeed } from "./seedData";
import { CITY_SEED, DEPARTMENT_SEED, STATE_SEED, resolveStateCode } from "./taxonomy";
import { toDbOutcome } from "../reporting/schema";
import { generatePublicId } from "../reporting/publicId";
import { invalidateCache } from "../data";

export async function seedTaxonomy(db: Db): Promise<void> {
  await db.insert(departments).values(DEPARTMENT_SEED.map((d) => ({ ...d }))).onConflictDoNothing();
  await db.insert(states).values(STATE_SEED).onConflictDoNothing();
  await db.insert(cities).values(CITY_SEED.map((c) => ({ name: c.name, stateCode: c.state }))).onConflictDoNothing();
}

export async function seedReports(db: Db): Promise<number> {
  const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(reports);
  if (Number(c) > 0) return 0;
  const depts = await db.select().from(departments);
  const deptId = new Map(depts.map((d) => [d.slug, d.id]));
  const cityRows = await db.select().from(cities);
  const cityId = new Map(cityRows.map((r) => [`${r.name.toLowerCase()}|${r.stateCode}`, r.id]));
  const used = new Set<string>();
  const rows = buildSeed().map((r) => {
    const stateCode = resolveStateCode(r.state)!;
    let pid = generatePublicId();
    while (used.has(pid)) pid = generatePublicId();
    used.add(pid);
    return {
      id: r.id,
      publicId: pid,
      reportType: r.reportType,
      departmentId: deptId.get(r.departmentSlug)!,
      service: r.service ?? null,
      officialRole: r.officialRole ?? null,
      amount: r.reportType === "paid" ? r.amount : null,
      mode: r.mode ?? null,
      cityId: cityId.get(`${r.city.toLowerCase()}|${stateCode}`) ?? null,
      cityText: r.city,
      stateCode,
      incidentDate: r.date,
      outcome: toDbOutcome(r.reportType, r.outcome),
      note: r.note ?? null,
      status: "published" as const,
      ipHash: r.ipHash,
      helpfulCount: r.helpfulCount,
      fakeCount: r.fakeCount,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.createdAt),
    };
  });
  for (let i = 0; i < rows.length; i += 50) await db.insert(reports).values(rows.slice(i, i + 50));
  invalidateCache();
  return rows.length;
}

export async function seedAll(db?: Db): Promise<{ reports: number }> {
  const d = db ?? (await getDb());
  await seedTaxonomy(d);
  const n = await seedReports(d);
  return { reports: n };
}

/** Dev convenience: seed on first boot when the DB is empty. */
export async function ensureSeeded(db: Db): Promise<void> {
  const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(departments);
  if (Number(c) === 0) await seedAll(db);
}

export { eq };
