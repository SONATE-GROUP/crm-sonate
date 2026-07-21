import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionCookieValue } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionCookieValue(cookie)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

// /api/* est exclu de cette auth par cookie : ces routes vérifient leur
// propre clé API (cf. app/api/leads/route.ts), destinées à des appels
// machine (Make/n8n), pas à un navigateur. /login est exclu pour éviter une
// boucle de redirection infinie. /invite/* est exclu : un invité qui clique
// le lien reçu par email n'a pas encore de session.
export const config = {
  matcher: ["/((?!api|login|invite|_next/static|_next/image|favicon.ico).*)"],
};
