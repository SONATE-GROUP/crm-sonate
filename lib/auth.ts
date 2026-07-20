import crypto from "crypto";

/**
 * AUTH_USERS="alice:$2b$10$...,bob:$2b$10$..." — paires username:bcryptHash
 * séparées par des virgules. Générer un hash avec scripts/hash-password.ts.
 */
export function getAccounts(): Record<string, string> {
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

export const SESSION_COOKIE = "crm_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// Signe les cookies de session avec AUTH_USERS comme clé : évite d'introduire
// une variable d'environnement dédiée pour ça, et changer AUTH_USERS invalide
// au passage toutes les sessions existantes (comportement voulu).
function sign(payload: string): string {
  return crypto.createHmac("sha256", process.env.AUTH_USERS ?? "").update(payload).digest("hex");
}

export function createSessionCookieValue(username: string): string {
  const expiry = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${username}.${expiry}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookieValue(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [username, expiryStr, signature] = parts;
  const expected = sign(`${username}.${expiryStr}`);
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
    return null;
  }
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
  if (!getAccounts()[username]) return null;
  return username;
}
