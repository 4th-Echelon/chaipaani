import { NextRequest } from "next/server";
import { store } from "@/lib/data";
import { fail, ok } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const a = p.get("a");
  const b = p.get("b");
  if (!a || !b) return fail("a and b are required");
  const [sa, sb] = await Promise.all([store.deptStat(a), store.deptStat(b)]);
  if (!sa || !sb) return fail("Unknown department", 404);
  return ok({ a: sa, b: sb });
}
