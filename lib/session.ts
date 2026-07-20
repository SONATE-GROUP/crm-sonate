import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySessionCookieValue } from "@/lib/auth";

/** Email de l'utilisateur connecté (Server Components/Actions/Route Handlers uniquement). */
export async function getCurrentUserEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifySessionCookieValue(cookieStore.get(SESSION_COOKIE)?.value);
}
