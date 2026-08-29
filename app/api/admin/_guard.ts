import { adminFromRequest, unauthorized } from "@/lib/admin/auth";

/** Returns the admin name or a 401 Response. */
export function guard(req: Request): { admin: string } | { res: Response } {
  const admin = adminFromRequest(req);
  return admin ? { admin } : { res: unauthorized() };
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
