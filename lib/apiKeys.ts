import crypto from "crypto";

const KEY_PREFIX = "sk_live_";

export function generateApiKey(): { plaintext: string; hash: string; preview: string } {
  const plaintext = `${KEY_PREFIX}${crypto.randomBytes(24).toString("base64url")}`;
  return { plaintext, hash: hashApiKey(plaintext), preview: plaintext.slice(-4) };
}

export function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}
