"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";

import { db } from "@/db/client";
import { apiKeys, integrationSettings, type IntegrationProvider } from "@/db/schema";
import { generateApiKey } from "@/lib/apiKeys";
import { getCurrentUserEmail } from "@/lib/session";

export type CreateApiKeyResult =
  | { plaintext: string; id: number; label: string; keyPreview: string; createdAt: Date }
  | { error: string };

/** Crée une nouvelle clé API d'ingestion pour l'utilisateur connecté — la valeur en clair n'est retournée qu'une fois. */
export async function createApiKey(label: string): Promise<CreateApiKeyResult> {
  const owner = await getCurrentUserEmail();
  if (!owner) return { error: "Non authentifié." };

  const cleanLabel = label.trim();
  if (!cleanLabel) return { error: "Un nom est requis (ex: \"Make - import Deuxio\")." };

  const { plaintext, hash, preview } = generateApiKey();
  const [inserted] = await db
    .insert(apiKeys)
    .values({ ownerEmail: owner, label: cleanLabel, keyHash: hash, keyPreview: preview })
    .returning({ id: apiKeys.id, createdAt: apiKeys.createdAt });
  updateTag("crm-settings");
  return { plaintext, id: inserted.id, label: cleanLabel, keyPreview: preview, createdAt: inserted.createdAt };
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
