import { dumpRows, rowsToCsv } from "@/lib/dump";
import { fail } from "../../_lib";

export const dynamic = "force-dynamic";

/** GET /api/dump/latest.csv | latest.json */
export async function GET(_req: Request, { params }: { params: { file: string } }) {
  const rows = await dumpRows();
  const stamp = new Date().toISOString().slice(0, 10);
  if (params.file === "latest.csv") {
    return new Response(rowsToCsv(rows), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=chaipaani-${stamp}.csv`, "cache-control": "public, max-age=3600" },
    });
  }
  if (params.file === "latest.json") {
    return new Response(JSON.stringify({ generated_at: new Date().toISOString(), count: rows.length, reports: rows }), {
      headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename=chaipaani-${stamp}.json`, "cache-control": "public, max-age=3600" },
    });
  }
  return fail("Unknown dump. Use latest.csv or latest.json", 404);
}
