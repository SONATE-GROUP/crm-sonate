import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { companies } from "@/db/schema";
import { enrichCompanyLinkedIn, searchCompanyLinkedIn, websiteContactSocial } from "@/lib/derrick";
import { saveEnrichmentRun } from "@/lib/enrichment-runs";
import { getAnyIntegrationSetting } from "@/lib/queries";

/**
 * Enrichissement automatique d'une entreprise nouvellement créée via
 * l'ingestion live (aucune correspondance trouvée, cf. lib/ingest.ts).
 * Réutilise les mêmes appels Derrick que l'enrichissement manuel
 * (lib/manual-enrichment.ts) et écrit dans la même table enrichment_runs,
 * pour que le résultat apparaisse de façon identique sur la fiche entreprise
 * qu'il ait été déclenché automatiquement ou à la main.
 *
 * Appelée via `after()` dans la route d'ingestion (cf. app/api/leads/route.ts)
 * pour ne pas bloquer la réponse au webhook Make/n8n.
 */
export async function triggerEnrichment(companyId: number): Promise<void> {
  const apiKey = await getAnyIntegrationSetting("derrick_app");
  if (!apiKey) {
    console.warn(
      `[enrichment] pas de clé Derrick App configurée (page /settings) — company ${companyId} non enrichie automatiquement`
    );
    return;
  }

  const [company] = await db
    .select({ name: companies.name, website: companies.website, linkedinUrl: companies.linkedinUrl })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) return;

  if (company.website) {
    try {
      const data = await websiteContactSocial(apiKey, company.website);
      await saveEnrichmentRun({
        entityType: "company",
        entityId: companyId,
        enrichmentType: "website_contact_social",
        status: "done",
        resultData: data,
        creditsUsed: 2,
      });
    } catch (err) {
      await saveEnrichmentRun({
        entityType: "company",
        entityId: companyId,
        enrichmentType: "website_contact_social",
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
        creditsUsed: 0,
      });
    }
  }

  try {
    let linkedinUrl = company.linkedinUrl;
    let creditsUsed = 0;
    let searchResult: unknown;
    if (!linkedinUrl) {
      const found = await searchCompanyLinkedIn(apiKey, company.name);
      creditsUsed += 1;
      searchResult = found;
      if (!found.companyUrl) throw new Error("Profil LinkedIn de l'entreprise introuvable.");
      linkedinUrl = found.companyUrl;
      await db.update(companies).set({ linkedinUrl }).where(eq(companies.id, companyId));
    }
    const enriched = await enrichCompanyLinkedIn(apiKey, linkedinUrl);
    creditsUsed += 1;
    await saveEnrichmentRun({
      entityType: "company",
      entityId: companyId,
      enrichmentType: "linkedin_company",
      status: "done",
      resultData: searchResult ? { search: searchResult, profile: enriched } : enriched,
      creditsUsed,
    });
  } catch (err) {
    await saveEnrichmentRun({
      entityType: "company",
      entityId: companyId,
      enrichmentType: "linkedin_company",
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
      creditsUsed: 0,
    });
  }
}
