import { getAnyIntegrationSetting } from "@/lib/queries";

export type GoogleOAuthConfig = { clientId: string; clientSecret: string };

/** Lit la config Google OAuth (Client ID + Secret) stockée en base — cf. /settings, provider "google_oauth". */
export async function getGoogleOAuthConfig(): Promise<GoogleOAuthConfig | null> {
  const raw = await getAnyIntegrationSetting("google_oauth");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.clientId === "string" && typeof parsed.clientSecret === "string") {
      return { clientId: parsed.clientId, clientSecret: parsed.clientSecret };
    }
    return null;
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(config: GoogleOAuthConfig, redirectUri: string, state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

type GoogleUserInfo = { email: string; email_verified: boolean; name?: string };

/** Échange le code d'autorisation contre un token puis récupère l'email/nom Google de l'utilisateur. */
export async function exchangeGoogleCode(
  config: GoogleOAuthConfig,
  code: string,
  redirectUri: string
): Promise<GoogleUserInfo | null> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    console.error("exchangeGoogleCode: échec échange token", await tokenResponse.text());
    return null;
  }
  const tokenData = await tokenResponse.json();

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userInfoResponse.ok) {
    console.error("exchangeGoogleCode: échec récupération userinfo", await userInfoResponse.text());
    return null;
  }
  return userInfoResponse.json();
}
