import crypto from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { appSecrets } from "@/db/schema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export const SESSION_COOKIE = "crm_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const SESSION_SECRET_KEY = "session_secret";

// Mis en cache au niveau du process (une lambda "chaude" réutilise cette
// valeur) : évite une lecture DB à chaque requête tout en évitant
// d'introduire une variable d'environnement dédiée pour ce secret.
let cachedSecret: string | null = null;

async function getSessionSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  const [existing] = await db.select().from(appSecrets).where(eq(appSecrets.key, SESSION_SECRET_KEY)).limit(1);
  if (existing) {
    cachedSecret = existing.value;
    return cachedSecret;
  }

  const generated = crypto.randomBytes(32).toString("hex");
  await db.insert(appSecrets).values({ key: SESSION_SECRET_KEY, value: generated }).onConflictDoNothing({ target: appSecrets.key });
  const [row] = await db.select().from(appSecrets).where(eq(appSecrets.key, SESSION_SECRET_KEY)).limit(1);
  cachedSecret = row!.value;
  return cachedSecret;
}

async function sign(payload: string): Promise<string> {
  const secret = await getSessionSecret();
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// "|" (pas ".") sépare les segments : un id numérique et une expiry ne
// contiennent jamais de "|".
export async function createSessionCookieValue(userId: number): Promise<string> {
  const expiry = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}|${expiry}`;
  return `${payload}|${await sign(payload)}`;
}

/**
 * Vérifie la signature et l'expiration du cookie et retourne l'id utilisateur
 * signé. Volontairement stateless (pas de lecture de la table `users` ici) :
 * appelée depuis proxy.ts sur (presque) chaque requête, elle reste rapide et
 * ne dépend que du secret de signature en cache. La vérification que
 * l'utilisateur existe toujours / son rôle / ses espaces se fait plus loin
 * (lib/session.ts, dans les Server Components) où l'accès DB est normal.
 */
export async function verifySessionCookieValue(cookieValue: string | undefined): Promise<number | null> {
  if (!cookieValue) return null;
  const parts = cookieValue.split("|");
  if (parts.length !== 3) return null;
  const [userIdStr, expiryStr, signature] = parts;
  const expected = await sign(`${userIdStr}|${expiryStr}`);
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
    return null;
  }
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
  const userId = Number(userIdStr);
  if (!Number.isInteger(userId)) return null;
  return userId;
}
