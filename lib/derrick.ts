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

export type SearchLinkedInProfileResult = {
  url?: string;
  title?: string;
  confidence?: string;
  description?: string;
};

/** Retrouve l'URL du profil LinkedIn d'un contact à partir de son nom (+ entreprise en option) (1 crédit). */
export function searchLinkedInProfile(apiKey: string, queryValue: string, companyValue?: string) {
  return callDerrick<SearchLinkedInProfileResult>("search_linkedin_profile", apiKey, {
    queryValue,
    ...(companyValue ? { companyValue } : {}),
  });
}

/** Enrichit un profil avec +15 attributs à partir de son URL LinkedIn (1 crédit). */
export function enrichLinkedInProfile(apiKey: string, profileUrl: string) {
  return callDerrick<Record<string, unknown>>("enrich_profile", apiKey, { queryValue: profileUrl });
}

export type FindEmailResult = { email?: string; emailStatus?: string };

/** Trouve l'email professionnel à partir du nom complet et de l'entreprise (5 crédits). */
export function findEmail(apiKey: string, fullName: string, company: string, linkedinCompanyURL?: string) {
  return callDerrick<FindEmailResult>("find_email", apiKey, {
    fullName,
    company,
    ...(linkedinCompanyURL ? { linkedinCompanyURL } : {}),
  });
}

export type FindPhoneResult = { number?: string; country?: string };

/** Trouve le téléphone mobile à partir d'une URL de profil LinkedIn (150 crédits, le plus cher de l'API). */
export function findPhone(apiKey: string, linkedinProfilUrl: string) {
  return callDerrick<FindPhoneResult>("find_phone", apiKey, { linkedinProfilUrl });
}

export type VerifyEmailResult = { certainty?: string };

/** Vérifie la validité d'une adresse email (1 crédit). */
export function verifyEmail(apiKey: string, email: string) {
  return callDerrick<VerifyEmailResult>("verify_email", apiKey, { email });
}
