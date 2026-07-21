import crypto from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildGoogleAuthUrl, getGoogleOAuthConfig } from "@/lib/google-auth";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

/** Démarre le flux OAuth Google : redirige vers l'écran de consentement Google. */
export async function GET(request: NextRequest) {
  const config = await getGoogleOAuthConfig();
  if (!config) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const nextParam = request.nextUrl.searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/companies";

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${nonce}.${encodeURIComponent(next)}`;
  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();

  const response = NextResponse.redirect(buildGoogleAuthUrl(config, redirectUri, state));
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  return response;
}
