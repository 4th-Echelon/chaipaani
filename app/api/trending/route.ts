import { store } from "@/lib/data";
import { ok, publicReport } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET() {
  const t = await store.trending(5);
  return ok(t.map(publicReport));
}
