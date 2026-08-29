import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { adminFromRequest } from "@/lib/admin/auth";
import { refreshSnapshots } from "@/lib/stats/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function bearerOk(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Bearer ")) return false;
  const given = Buffer.from(h.slice(7));
  const want = Buffer.from(secret);
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}

/**
 * Recomputes every statistics snapshot. Called by Vercel Cron (Bearer CRON_SECRET)
 * or by a moderator (HTTP Basic). Returns per-key timings.
 */
async function handle(req: Request) {
  if (!bearerOk(req) && !adminFromRequest(req)) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const summary = await refreshSnapshots();
  const failed = summary.filter((s) => !s.ok).length;
  return NextResponse.json({ data: { summary, failed, ms: Date.now() - started }, error: null }, { status: failed ? 207 : 200 });
}

export const GET = handle;
export const POST = handle;
