import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createSessionCookieValue, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { exchangeGoogleCode, getGoogleOAuthConfig } from "@/lib/google-auth";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/app/api/auth/google/start/route";

function loginError(request: NextRequest, error: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error);
  return NextResponse.redirect(loginUrl);
}

/** Callback OAuth Google : vérifie le state, échange le code, connecte si le compte existe déjà. */
export async function GET(request: NextRequest) {
  const config = await getGoogleOAuthConfig();
  if (!config) return loginError(request, "google_not_configured");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) return loginError(request, "google_failed");

  const [nonce, encodedNext] = state.split(".");
  const expectedNonce = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!expectedNonce || nonce !== expectedNonce) return loginError(request, "google_failed");
  const next = encodedNext && decodeURIComponent(encodedNext).startsWith("/") ? decodeURIComponent(encodedNext) : "/companies";

  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
  const userInfo = await exchangeGoogleCode(config, code, redirectUri);
  if (!userInfo || !userInfo.email_verified) return loginError(request, "google_failed");

  const email = userInfo.email.toLowerCase();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) return loginError(request, "google_no_account");

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(SESSION_COOKIE, await createSessionCookieValue(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return response;
}
