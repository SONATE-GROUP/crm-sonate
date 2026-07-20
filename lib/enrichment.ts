import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { companies } from "@/db/schema";
import { enrichCompanyLinkedIn, searchCompanyLinkedIn, websiteContactSocial } from "@/lib/derrick";
import { getAnyIntegrationSetting } from "@/lib/queries";

/**
 * Enrichit une entreprise nouvellement créée via l'API Derrick App :
 * - site web connu -> emails/téléphones/réseaux sociaux (website_contact_social)
 * - pas d'URL LinkedIn connue -> recherche par nom (search_companies), puis
 *   dans les deux cas -> données LinkedIn company (enrich_companies)
 * Chaque appel est tenté indépendamment : l'échec d'un des trois n'empêche
 * pas les autres, et le résultat (partiel ou complet) est stocké tel quel
 * dans enrichmentData plutôt que d'annuler l'ensemble.
 *
 * Appelée via `after()` dans la route d'ingestion (cf. app/api/leads/route.ts)
 * pour ne pas bloquer la réponse au webhook Make/n8n.
 */
export async function triggerEnrichment(companyId: number): Promise<void> {
  try {
    const [company] = await db
      .select({ name: companies.name, website: companies.website, linkedinUrl: companies.linkedinUrl })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    if (!company) return;

    const apiKey = await getAnyIntegrationSetting("derrick_app");
    if (!apiKey) {
      console.warn(
        `[enrichment] pas de clé Derrick App configurée (page /settings) — company ${companyId} reste en statut "pending"`
      );
      return;
    }

    const result: Record<string, unknown> = {};
    const errors: string[] = [];

    if (company.website) {
      try {
        result.websiteContactSocial = await websiteContactSocial(apiKey, company.website);
      } catch (err) {
        errors.push(`website_contact_social: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    let linkedinCompanyUrl = company.linkedinUrl;
    if (!linkedinCompanyUrl) {
      try {
        const found = await searchCompanyLinkedIn(apiKey, company.name);
        result.linkedinSearch = found;
        if (found.companyUrl) linkedinCompanyUrl = found.companyUrl;
      } catch (err) {
        errors.push(`search_companies: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (linkedinCompanyUrl) {
      try {
        result.linkedinCompany = await enrichCompanyLinkedIn(apiKey, linkedinCompanyUrl);
      } catch (err) {
        errors.push(`enrich_companies: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (errors.length > 0) result.errors = errors;

    const hasData = Object.keys(result).some((key) => key !== "errors");
    await db
      .update(companies)
      .set({ enrichmentStatus: hasData ? "done" : "failed", enrichmentData: JSON.stringify(result) })
      .where(eq(companies.id, companyId));
  } catch (err) {
    console.error(`[enrichment] échec pour company ${companyId}`, err);
    await db.update(companies).set({ enrichmentStatus: "failed" }).where(eq(companies.id, companyId));
  }
}
