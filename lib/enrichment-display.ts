export type EnrichmentSummary = {
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  industry?: string;
  staffCountRange?: string;
  followers?: number;
  description?: string;
};

/** Extrait les champs les plus utiles du JSON brut stocké dans companies.enrichmentData. */
export function parseEnrichmentSummary(raw: string | null): EnrichmentSummary | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const contact = (data.websiteContactSocial ?? {}) as Record<string, unknown>;
    const linkedin = (data.linkedinCompany ?? {}) as Record<string, unknown>;
    const search = (data.linkedinSearch ?? {}) as Record<string, unknown>;

    return {
      email: asString(contact.email),
      phone: asString(contact.phone),
      linkedinUrl: asString(linkedin["Company linkedinUrl"]) ?? asString(search.companyUrl),
      industry: asString(linkedin["Company industries"]),
      staffCountRange: asString(linkedin["Company staff count range"]),
      followers: asNumber(linkedin["Company followers"]),
      description: asString(linkedin["Company description"]),
    };
  } catch {
    return null;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
