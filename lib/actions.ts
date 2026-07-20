"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";

import { db } from "@/db/client";
import { contacts, deals, pendingLeads, DEAL_STATUS_VALUES, type DealStatus } from "@/db/schema";
import type { LeadPayload } from "@/lib/ingest";
import { cleanText, normalizeEmail } from "@/lib/normalize";

/** Changement de statut depuis le board kanban (drag-and-drop). */
export async function updateDealStatus(dealId: number, status: DealStatus) {
  if (!DEAL_STATUS_VALUES.includes(status)) {
    throw new Error(`Statut de deal invalide: "${status}"`);
  }
  await db.update(deals).set({ status, updatedAt: new Date() }).where(eq(deals.id, dealId));
  updateTag("crm-data");
}

/**
 * Accepte une proposition de fusion : les données du lead en attente
 * s'additionnent à l'entreprise déjà connue — nouveau contact si son email
 * n'était pas déjà rattaché à cette entreprise, et surtout nouveau deal
 * (jamais de fusion "silencieuse" qui écraserait des champs existants).
 */
export async function mergePendingLead(pendingLeadId: number) {
  const [pending] = await db.select().from(pendingLeads).where(eq(pendingLeads.id, pendingLeadId)).limit(1);
  if (!pending || pending.status !== "pending" || !pending.matchedCompanyId) return;

  const companyId = pending.matchedCompanyId;
  const payload: LeadPayload = JSON.parse(pending.rawPayload);

  let contactId = pending.matchedContactId;
  const email = normalizeEmail(payload.contact?.email);
  if (!contactId && (email || payload.contact?.fullName)) {
    const [created] = await db
      .insert(contacts)
      .values({
        companyId,
        fullName: cleanText(payload.contact?.fullName) ?? "Inconnu",
        email,
        phone: cleanText(payload.contact?.phone),
        role: cleanText(payload.contact?.role),
      })
      .returning({ id: contacts.id });
    contactId = created.id;
  }

  await db.insert(deals).values({
    companyId,
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
  });

  await db.update(pendingLeads).set({ status: "merged", resolvedAt: new Date() }).where(eq(pendingLeads.id, pendingLeadId));

  updateTag("crm-data");
}

/** Rejette une proposition de fusion : rien n'est créé, le lead reste tracé mais ignoré. */
export async function dismissPendingLead(pendingLeadId: number) {
  await db
    .update(pendingLeads)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(eq(pendingLeads.id, pendingLeadId));

  updateTag("crm-data");
}
