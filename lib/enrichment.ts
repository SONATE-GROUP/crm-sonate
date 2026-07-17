import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { companies } from "@/db/schema";

/**
 * TODO: brancher l'appel réel à l'API Derrick App (doc fournie par ailleurs)
 * une fois son contrat exact connu (endpoint, auth, format de payload et de
 * réponse). En attendant, on se contente de marquer le statut pour que
 * l'absence d'enrichissement reste visible dans l'UI plutôt que silencieuse.
 *
 * Appelée via `after()` dans la route d'ingestion (cf. app/api/leads/route.ts)
 * pour ne pas bloquer la réponse au webhook Make/n8n.
 */
export async function triggerEnrichment(companyId: number): Promise<void> {
  try {
    // const response = await fetch("https://app1.derrick-app.com/api/v1/...", { ... });
    // await db.update(companies).set({ enrichmentStatus: "done", enrichmentData: JSON.stringify(data) }).where(eq(companies.id, companyId));
    console.warn(`[enrichment] TODO Derrick App non branché — company ${companyId} reste en statut "pending"`);
  } catch (err) {
    console.error(`[enrichment] échec pour company ${companyId}`, err);
    await db.update(companies).set({ enrichmentStatus: "failed" }).where(eq(companies.id, companyId));
  }
}
