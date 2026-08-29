import type { MetadataRoute } from "next";
import { DEPARTMENTS, store } from "@/lib/data";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chaipaani.in";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = ["", "/report", "/reports", "/dept", "/cities", "/compare", "/data", "/know-before-you-go", "/terms"].map((p) => ({
    url: `${site}${p}`,
    lastModified: now,
    changeFrequency: p === "" || p === "/reports" ? "hourly" : "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
  const depts: MetadataRoute.Sitemap = DEPARTMENTS.map((d) => ({ url: `${site}/dept/${d.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.6 }));
  let reportUrls: MetadataRoute.Sitemap = [];
  try {
    const { reports } = await store.listReports({ limit: 5000 });
    reportUrls = reports.map((r) => ({
      url: `${site}/reports/${r.publicId ?? r.id}`,
      lastModified: new Date(r.createdAt),
      changeFrequency: "monthly",
      priority: 0.4,
    }));
  } catch {
    // The sitemap must still resolve when the database is unreachable.
  }
  return [...fixed, ...depts, ...reportUrls];
}
