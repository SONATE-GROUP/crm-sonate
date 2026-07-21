import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { after } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { hashApiKey } from "@/lib/apiKeys";
import { ingestLead, InvalidLeadPayloadError, type LeadPayload } from "@/lib/ingest";
import { triggerEnrichment } from "@/lib/enrichment";

/**
 * Point d'entrée pour Make/n8n (ou tout autre système) : POST un lead, il est
 * créé (+ enrichissement déclenché en arrière-plan) s'il est nouveau, ou mis
 * en file d'attente de fusion s'il correspond à une fiche existante — voir
 * lib/ingest.ts pour la logique, README.md pour le format de payload attendu.
 *
 * Authentification par clé API (indépendante de l'auth humaine de proxy.ts) :
 * header "x-api-key" ou "Authorization: Bearer <clé>", vérifiée contre les
 * clés générées par chaque utilisateur depuis /settings (table api_keys).
 * Chaque clé est rattachée à un espace : les leads qu'elle ingère y sont
 * systématiquement créés (jamais d'entreprise hors espace).
 */
export async function POST(request: NextRequest) {
  const providedKey =
    request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!providedKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [matchedKey] = await db
    .select({ id: apiKeys.id, workspaceId: apiKeys.workspaceId })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hashApiKey(providedKey)))
    .limit(1);

  if (!matchedKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!matchedKey.workspaceId) {
    return NextResponse.json(
      { error: "no_workspace", message: "Cette clé n'a pas d'espace rattaché — configure-le depuis /settings." },
      { status: 409 }
    );
  }
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, matchedKey.id));

  let payload: LeadPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await ingestLead(payload, matchedKey.workspaceId);
    if (result.outcome === "created") {
      after(() => triggerEnrichment(result.companyId));
    }
    return NextResponse.json(result, { status: result.outcome === "created" ? 201 : 200 });
  } catch (err) {
    if (err instanceof InvalidLeadPayloadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
