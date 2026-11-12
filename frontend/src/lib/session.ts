import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "tm_session";

/** Authorization header for FastAPI, built from the httpOnly session cookie. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
