import { sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/db/client";
import {
  companies,
  contacts,
  deals,
  pendingLeads,
  DEAL_STATUS_VALUES,
  SOURCE_SYSTEM_VALUES,
  type B2bB2c,
  type DealStatus,
  type SourceSystem,
} from "@/db/schema";
import { cleanText, normalizeCompanyKey, normalizeEmail } from "@/lib/normalize";

export type LeadPayload = {
  company: {
    name: string;
    website?: string;
    sector?: string;
    b2bB2c?: B2bB2c;
    linkedinUrl?: string;
    sourceSystem?: SourceSystem;
  };
  contact?: {
    fullName?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  deal?: {
    status?: DealStatus;
    qualification?: string;
    score?: number;
    montantDevis?: number;
    panierMoyen?: string;
    caMensuel?: string;
    depenseMarketingMensuelle?: string;
    besoinPrincipal?: string;
    kpiCible?: string;
    raisonDeRefus?: string;
    message?: string;
    owner?: string;
    source?: string;
  };
};

export class InvalidLeadPayloadError extends Error {}

function assertValidPayload(payload: LeadPayload) {
  if (!payload || typeof payload !== "object") {
    throw new InvalidLeadPayloadError("Le corps de la requête doit être un objet JSON.");
  }
  if (!payload.company?.name || !cleanText(payload.company.name)) {
    throw new InvalidLeadPayloadError("company.name est requis.");
  }
  if (payload.company.sourceSystem && !SOURCE_SYSTEM_VALUES.includes(payload.company.sourceSystem)) {
    throw new InvalidLeadPayloadError(
      `company.sourceSystem invalide: "${payload.company.sourceSystem}". Valeurs acceptées: ${SOURCE_SYSTEM_VALUES.join(", ")}`
    );
  }
  if (payload.deal?.status && !DEAL_STATUS_VALUES.includes(payload.deal.status)) {
    throw new InvalidLeadPayloadError(
      `deal.status invalide: "${payload.deal.status}". Valeurs acceptées: ${DEAL_STATUS_VALUES.join(", ")}`
    );
  }
}

export type IngestResult =
  | { outcome: "created"; companyId: number; contactId: number | null; dealId: number }
  | { outcome: "pending_merge"; pendingLeadId: number; matchedCompanyId: number | null; matchedContactId: number | null };

/**
 * Point d'entrée de l'ingestion live (Make/n8n via POST /api/leads).
 *
 * Contrairement à l'import batch (scripts/import.ts) qui réutilise
 * silencieusement une entreprise/contact déjà connu, l'ingestion live ne
 * fusionne jamais automatiquement : toute correspondance (email du contact
 * OU nom d'entreprise normalisé) fait atterrir le lead dans `pending_leads`
 * pour validation humaine — cf. lib/actions.ts pour la fusion effective.
 */
export async function ingestLead(payload: LeadPayload): Promise<IngestResult> {
  assertValidPayload(payload);

  const companyName = cleanText(payload.company.name)!;
  const email = normalizeEmail(payload.contact?.email);
  const companyKey = normalizeCompanyKey(companyName);

  let matchedContactId: number | null = null;
  let matchedCompanyId: number | null = null;

  if (email) {
    const [match] = await db
      .select({ id: contacts.id, companyId: contacts.companyId })
      .from(contacts)
      .where(sql`lower(${contacts.email}) = ${email}`)
      .limit(1);
    if (match) {
      matchedContactId = match.id;
      matchedCompanyId = match.companyId;
    }
  }

  if (!matchedCompanyId) {
    // Charge tout le nom des entreprises pour comparer les clés normalisées en
    // mémoire (la normalisation n'est pas exprimable en SQL). Acceptable tant
    // que la base reste de l'ordre du millier d'entreprises ; à revoir (colonne
    // normalized_key indexée, remplie à l'écriture) si le volume grossit
    // significativement.
    const allCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies);
    const match = allCompanies.find((c) => normalizeCompanyKey(c.name) === companyKey);
    if (match) matchedCompanyId = match.id;
  }

  if (matchedCompanyId || matchedContactId) {
    const [inserted] = await db
      .insert(pendingLeads)
      .values({
        matchedCompanyId,
        matchedContactId,
        rawPayload: JSON.stringify(payload),
      })
      .returning({ id: pendingLeads.id });
    revalidateTag("crm-data", { expire: 0 });
    return { outcome: "pending_merge", pendingLeadId: inserted.id, matchedCompanyId, matchedContactId };
  }

  const [company] = await db
    .insert(companies)
    .values({
      name: companyName,
      website: cleanText(payload.company.website),
      sector: cleanText(payload.company.sector),
      b2bB2c: payload.company.b2bB2c ?? null,
      linkedinUrl: cleanText(payload.company.linkedinUrl),
      sourceSystem: payload.company.sourceSystem ?? "api",
    })
    .returning({ id: companies.id });

  let contactId: number | null = null;
  const contactName = cleanText(payload.contact?.fullName);
  if (contactName || email) {
    const [contact] = await db
      .insert(contacts)
      .values({
        companyId: company.id,
        fullName: contactName ?? "Inconnu",
        email,
        phone: cleanText(payload.contact?.phone),
        role: cleanText(payload.contact?.role),
      })
      .returning({ id: contacts.id });
    contactId = contact.id;
  }

  const [deal] = await db
    .insert(deals)
    .values({
      companyId: company.id,
      status: payload.deal?.status ?? null,
      qualification: cleanText(payload.deal?.qualification),
      score: payload.deal?.score ?? null,
      montantDevis: payload.deal?.montantDevis ?? null,
      panierMoyen: cleanText(payload.deal?.panierMoyen),
      caMensuel: cleanText(payload.deal?.caMensuel),
      depenseMarketingMensuelle: cleanText(payload.deal?.depenseMarketingMensuelle),
      besoinPrincipal: cleanText(payload.deal?.besoinPrincipal),
      kpiCible: cleanText(payload.deal?.kpiCible),
      raisonDeRefus: cleanText(payload.deal?.raisonDeRefus),
      message: cleanText(payload.deal?.message),
      owner: cleanText(payload.deal?.owner),
      source: cleanText(payload.deal?.source),
    })
    .returning({ id: deals.id });

  revalidateTag("crm-data", { expire: 0 });
  return { outcome: "created", companyId: company.id, contactId, dealId: deal.id };
}
