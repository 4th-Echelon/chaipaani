import { store } from "@/lib/data";
import { adminFromRequest } from "@/lib/admin/auth";
import { fail, ok, publicReport } from "../../_lib";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const admin = adminFromRequest(req);
  const r = await store.getReport(params.id, { includeHeld: !!admin });
  if (!r) return fail("Not found", 404);
  return ok(publicReport(r));
}
