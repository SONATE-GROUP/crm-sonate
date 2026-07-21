"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";

import { db } from "@/db/client";
import { apiKeys, integrationSettings, type IntegrationProvider } from "@/db/schema";
import { generateApiKey } from "@/lib/apiKeys";
import { getCurrentUser, getCurrentUserEmail } from "@/lib/session";

export type CreateApiKeyResult =
  | { plaintext: string; id: number; label: string; keyPreview: string; createdAt: Date; workspaceId: number }
  | { error: string };

/**
 * Crée une nouvelle clé API d'ingestion pour l'utilisateur connecté — la
 * valeur en clair n'est retournée qu'une fois. `workspaceId` est obligatoire :
 * chaque clé fait atterrir ses leads dans un espace précis, jamais hors
 * espace (cf. lib/ingest.ts). Un utilisateur ne peut choisir qu'un espace
 * dont il est membre (un admin peut choisir n'importe lequel).
 */
export async function createApiKey(label: string, workspaceId: number): Promise<CreateApiKeyResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Non authentifié." };

  const cleanLabel = label.trim();
  if (!cleanLabel) return { error: "Un nom est requis (ex: \"Make - import Deuxio\")." };
  if (!user.isAdmin && !user.workspaceIds.includes(workspaceId)) {
    return { error: "Tu n'as pas accès à cet espace." };
  }

  const { plaintext, hash, preview } = generateApiKey();
  const [inserted] = await db
    .insert(apiKeys)
    .values({ ownerEmail: user.email, label: cleanLabel, keyHash: hash, keyPreview: preview, workspaceId })
    .returning({ id: apiKeys.id, createdAt: apiKeys.createdAt });
  updateTag("crm-settings");
  return { plaintext, id: inserted.id, label: cleanLabel, keyPreview: preview, createdAt: inserted.createdAt, workspaceId };
}

/** Révoque une clé — seul son propriétaire peut la supprimer. */
export async function revokeApiKey(id: number) {
  const owner = await getCurrentUserEmail();
  if (!owner) return;
  await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.ownerEmail, owner)));
  updateTag("crm-settings");
}

/** Enregistre (crée ou remplace) l'identifiant d'une intégration tierce pour l'utilisateur connecté. */
export async function saveIntegrationSetting(provider: IntegrationProvider, value: string) {
  const owner = await getCurrentUserEmail();
  if (!owner) return;
  const trimmed = value.trim();
  if (!trimmed) return;

  const [existing] = await db
    .select({ id: integrationSettings.id })
    .from(integrationSettings)
    .where(and(eq(integrationSettings.ownerEmail, owner), eq(integrationSettings.provider, provider)));

  if (existing) {
    await db
      .update(integrationSettings)
      .set({ value: trimmed, updatedAt: new Date() })
      .where(eq(integrationSettings.id, existing.id));
  } else {
    await db.insert(integrationSettings).values({ ownerEmail: owner, provider, value: trimmed });
  }
  updateTag("crm-settings");
}

export async function deleteIntegrationSetting(provider: IntegrationProvider) {
  const owner = await getCurrentUserEmail();
  if (!owner) return;
  await db
    .delete(integrationSettings)
    .where(and(eq(integrationSettings.ownerEmail, owner), eq(integrationSettings.provider, provider)));
  updateTag("crm-settings");
}
