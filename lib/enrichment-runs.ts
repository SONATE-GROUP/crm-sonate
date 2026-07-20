import { desc, eq, and } from "drizzle-orm";

import { db } from "@/db/client";
import { enrichmentRuns, type EnrichmentEntityType, type EnrichmentRunStatus, type EnrichmentType } from "@/db/schema";

export async function saveEnrichmentRun(params: {
  entityType: EnrichmentEntityType;
  entityId: number;
  enrichmentType: EnrichmentType;
  status: EnrichmentRunStatus;
  resultData?: unknown;
  errorMessage?: string;
  creditsUsed: number;
}) {
  await db.insert(enrichmentRuns).values({
    entityType: params.entityType,
    entityId: params.entityId,
    enrichmentType: params.enrichmentType,
    status: params.status,
    resultData: params.resultData !== undefined ? JSON.stringify(params.resultData) : null,
    errorMessage: params.errorMessage,
    creditsUsed: params.creditsUsed,
  });
}

export type EnrichmentRunView = {
  status: EnrichmentRunStatus;
  resultData: unknown;
  errorMessage: string | null;
  creditsUsed: number | null;
  createdAt: Date;
};

/** Le dernier run par type pour une entité donnée (une entreprise ou un contact). */
export async function getLatestRunsForEntity(
  entityType: EnrichmentEntityType,
  entityId: number
): Promise<Partial<Record<EnrichmentType, EnrichmentRunView>>> {
  const rows = await db
    .select()
    .from(enrichmentRuns)
    .where(and(eq(enrichmentRuns.entityType, entityType), eq(enrichmentRuns.entityId, entityId)))
    .orderBy(desc(enrichmentRuns.createdAt));

  const latest: Partial<Record<EnrichmentType, EnrichmentRunView>> = {};
  for (const row of rows) {
    if (latest[row.enrichmentType]) continue;
    latest[row.enrichmentType] = {
      status: row.status,
      resultData: row.resultData ? JSON.parse(row.resultData) : null,
      errorMessage: row.errorMessage,
      creditsUsed: row.creditsUsed,
      createdAt: row.createdAt,
    };
  }
  return latest;
}
