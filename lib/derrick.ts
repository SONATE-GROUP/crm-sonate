const BASE_URL = "https://app1.derrick-app.com/api/v1";

export class DerrickApiError extends Error {
  status: number;
  errorType?: string;

  constructor(message: string, status: number, errorType?: string) {
    super(message);
    this.status = status;
    this.errorType = errorType;
  }
}

async function callDerrick<T>(endpoint: string, apiKey: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ data }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new DerrickApiError(
      json?.error ?? `Derrick API a répondu ${response.status}`,
      response.status,
      json?.errorType
    );
  }
  return json.data as T;
}

export type WebsiteContactSocial = {
  email?: string;
  phone?: string;
  LinkedIn?: string;
  Twitter?: string;
  Facebook?: string;
  Instagram?: string;
  [key: string]: unknown;
};

/** Extrait emails, téléphones et réseaux sociaux d'un site web (2 crédits). */
export function websiteContactSocial(apiKey: string, websiteUrl: string) {
  return callDerrick<WebsiteContactSocial>("website_contact_social", apiKey, { website_url: websiteUrl });
}

export type SearchCompanyResult = {
  companyUrl?: string;
  confidence?: string;
  companyName?: string;
  activityArea?: string;
};

/** Retrouve l'URL LinkedIn d'une entreprise à partir de son nom (1 crédit). */
export function searchCompanyLinkedIn(apiKey: string, companyName: string) {
  return callDerrick<SearchCompanyResult>("search_companies", apiKey, { queryValue: companyName });
}

/** Enrichit une entreprise avec les données LinkedIn (+15 attributs) à partir de son URL company (1 crédit). */
export function enrichCompanyLinkedIn(apiKey: string, linkedinCompanyUrl: string) {
  return callDerrick<Record<string, unknown>>("enrich_companies", apiKey, { queryValue: linkedinCompanyUrl });
}
