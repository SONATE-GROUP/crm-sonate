import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * AUTH_USERS="alice:$2b$10$...,bob:$2b$10$..." — paires username:bcryptHash
 * séparées par des virgules. Générer un hash avec scripts/hash-password.ts.
 */
function getAccounts(): Record<string, string> {
  const raw = process.env.AUTH_USERS ?? "";
  const accounts: Record<string, string> = {};
  for (const entry of raw.split(",")) {
    const separatorIndex = entry.indexOf(":");
    if (separatorIndex === -1) continue;
    const username = entry.slice(0, separatorIndex).trim();
    const hash = entry.slice(separatorIndex + 1).trim();
    if (username && hash) accounts[username] = hash;
  }
  return accounts;
}

function unauthorized() {
  return new Response("Authentification requise", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CRM Sonate"' },
  });
}

export function proxy(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return unauthorized();

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  const hash = getAccounts()[username];
  if (!hash || !bcrypt.compareSync(password, hash)) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
