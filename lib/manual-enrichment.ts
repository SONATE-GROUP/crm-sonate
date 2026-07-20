"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";

import { db } from "@/db/client";
import { companies, contacts, type EnrichmentEntityType, type EnrichmentType } from "@/db/schema";
import {
  DerrickApiError,
  enrichCompanyLinkedIn,
  enrichLinkedInProfile,
  findEmail,
  findPhone,
  searchCompanyLinkedIn,
  searchLinkedInProfile,
  verifyEmail,
  websiteContactSocial,
} from "@/lib/derrick";
import { saveEnrichmentRun } from "@/lib/enrichment-runs";
import { getAnyIntegrationSetting } from "@/lib/queries";

export type RunEnrichmentResult = { status: "done"; result: unknown } | { status: "failed"; message: string };

/**
 * Exécute un enrichissement Derrick App pour une entreprise ou un contact,
 * enregistre le résultat (succès ou échec) dans enrichment_runs, et renseigne
 * le champ correspondant sur la fiche (email, téléphone, URL LinkedIn) s'il
 * était vide — sans jamais écraser une valeur déjà présente.
 */
export async function runEnrichment(
  entityType: EnrichmentEntityType,
  entityId: number,
  type: EnrichmentType
): Promise<RunEnrichmentResult> {
  const apiKey = await getAnyIntegrationSetting("derrick_app");
  if (!apiKey) {
    return { status: "failed", message: "Aucune clé Derrick App configurée (page Paramètres)." };
  }

  try {
    const result = entityType === "company" ? await runCompanyEnrichment(entityId, type, apiKey) : await runContactEnrichment(entityId, type, apiKey);

    await saveEnrichmentRun({
      entityType,
      entityId,
      enrichmentType: type,
      status: "done",
      resultData: result.data,
      creditsUsed: result.creditsUsed,
    });
    updateTag("crm-data");
    return { status: "done", result: result.data };
  } catch (err) {
    const message = err instanceof DerrickApiError ? err.message : err instanceof Error ? err.message : String(err);
    await saveEnrichmentRun({
      entityType,
      entityId,
      enrichmentType: type,
      status: "failed",
      errorMessage: message,
      creditsUsed: 0,
    });
    updateTag("crm-data");
    return { status: "failed", message };
  }
}

async function runCompanyEnrichment(companyId: number, type: EnrichmentType, apiKey: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) throw new Error("Entreprise introuvable.");

  if (type === "website_contact_social") {
    if (!company.website) throw new Error("Cette entreprise n'a pas de site web renseigné.");
    const data = await websiteContactSocial(apiKey, company.website);
    return { data, creditsUsed: 2 };
  }

  if (type === "linkedin_company") {
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
    return { data: searchResult ? { search: searchResult, profile: enriched } : enriched, creditsUsed };
  }

  throw new Error(`Type d'enrichissement "${type}" invalide pour une entreprise.`);
}

async function runContactEnrichment(contactId: number, type: EnrichmentType, apiKey: string) {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) throw new Error("Contact introuvable.");
  const [company] = await db
    .select({ name: companies.name, linkedinUrl: companies.linkedinUrl })
    .from(companies)
    .where(eq(companies.id, contact.companyId))
    .limit(1);

  if (type === "linkedin_profile") {
    let linkedinUrl = contact.linkedinUrl;
    let creditsUsed = 0;
    let searchResult: unknown;
    if (!linkedinUrl) {
      const found = await searchLinkedInProfile(apiKey, contact.fullName, company?.name);
      creditsUsed += 1;
      searchResult = found;
      if (!found.url) throw new Error("Profil LinkedIn du contact introuvable.");
      linkedinUrl = found.url;
      await db.update(contacts).set({ linkedinUrl }).where(eq(contacts.id, contactId));
    }
    const enriched = await enrichLinkedInProfile(apiKey, linkedinUrl);
    creditsUsed += 1;
    return { data: searchResult ? { search: searchResult, profile: enriched } : enriched, creditsUsed };
  }

  if (type === "email") {
    const data = await findEmail(apiKey, contact.fullName, company?.name ?? "", company?.linkedinUrl ?? undefined);
    if (data.email && !contact.email) {
      await db.update(contacts).set({ email: data.email }).where(eq(contacts.id, contactId));
    }
    return { data, creditsUsed: 5 };
  }

  if (type === "phone") {
    if (!contact.linkedinUrl) throw new Error("Trouve d'abord le profil LinkedIn du contact.");
    const data = await findPhone(apiKey, contact.linkedinUrl);
    if (data.number && !contact.phone) {
      await db.update(contacts).set({ phone: data.number }).where(eq(contacts.id, contactId));
    }
    return { data, creditsUsed: 150 };
  }

  if (type === "verify_email") {
    if (!contact.email) throw new Error("Ce contact n'a pas d'email à vérifier.");
    const data = await verifyEmail(apiKey, contact.email);
    return { data, creditsUsed: 1 };
  }

  throw new Error(`Type d'enrichissement "${type}" invalide pour un contact.`);
}
