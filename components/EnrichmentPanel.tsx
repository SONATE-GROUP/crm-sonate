"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ENRICHMENT_TYPE_INFO, type EnrichmentEntityType, type EnrichmentType } from "@/db/schema";
import type { EnrichmentRunView } from "@/lib/enrichment-runs";
import { runEnrichment } from "@/lib/manual-enrichment";

function pick(data: unknown, key: string): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function summarize(type: EnrichmentType, data: unknown): string[] {
  const lines: string[] = [];
  const profile = (data && typeof data === "object" && "profile" in data ? (data as { profile: unknown }).profile : data) ?? data;

  if (type === "website_contact_social") {
    const email = pick(data, "email");
    const phone = pick(data, "phone");
    const linkedin = pick(data, "LinkedIn");
    if (email) lines.push(`Email : ${email}`);
    if (phone) lines.push(`Téléphone : ${phone}`);
    if (linkedin) lines.push(`LinkedIn : ${linkedin}`);
  } else if (type === "linkedin_company") {
    const industries = pick(profile, "Company industries");
    const staff = pick(profile, "Company staff count range");
    const followers = pick(profile, "Company followers");
    const description = pick(profile, "Company description");
    if (industries) lines.push(`Secteur : ${industries}`);
    if (staff) lines.push(`Effectif : ${staff}`);
    if (followers) lines.push(`Followers : ${followers}`);
    if (description) lines.push(description);
  } else if (type === "linkedin_profile") {
    const headline = pick(profile, "headline");
    const jobTitle = pick(profile, "job title");
    const companyName = pick(profile, "company name");
    if (headline) lines.push(headline);
    if (jobTitle) lines.push(`Poste : ${jobTitle}`);
    if (companyName) lines.push(`Entreprise (LinkedIn) : ${companyName}`);
  } else if (type === "email") {
    const email = pick(data, "email");
    const status = pick(data, "emailStatus");
    if (email) lines.push(`Email : ${email}${status ? ` (${status})` : ""}`);
  } else if (type === "phone") {
    const number = pick(data, "number");
    const country = pick(data, "country");
    if (number) lines.push(`Téléphone : ${number}${country ? ` (${country})` : ""}`);
  } else if (type === "verify_email") {
    const certainty = pick(data, "certainty");
    if (certainty) lines.push(`Validité : ${certainty}`);
  }

  return lines.length > 0 ? lines : ["Aucune donnée exploitable renvoyée."];
}

export function EnrichmentPanel({
  entityType,
  entityId,
  runs,
  disabledReasons = {},
}: {
  entityType: EnrichmentEntityType;
  entityId: number;
  runs: Partial<Record<EnrichmentType, EnrichmentRunView>>;
  disabledReasons?: Partial<Record<EnrichmentType, string>>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<EnrichmentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const types = (Object.keys(ENRICHMENT_TYPE_INFO) as EnrichmentType[]).filter(
    (t) => ENRICHMENT_TYPE_INFO[t].entityType === entityType
  );

  async function handleRun(type: EnrichmentType) {
    const info = ENRICHMENT_TYPE_INFO[type];
    const confirmed = window.confirm(
      `Ceci va consommer jusqu'à ${info.maxCredits} crédit${info.maxCredits > 1 ? "s" : ""} Derrick App. Continuer ?`
    );
    if (!confirmed) return;

    setPending(type);
    setError(null);
    const result = await runEnrichment(entityType, entityId, type);
    setPending(null);
    if (result.status === "failed") setError(`${info.label} : ${result.message}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-sonate-red/10 px-3 py-2 text-sm font-medium text-sonate-red">{error}</p>}
      {types.map((type) => {
        const info = ENRICHMENT_TYPE_INFO[type];
        const run = runs[type];
        const disabledReason = disabledReasons[type];

        return (
          <div key={type} className="rounded-xl border border-sonate-green/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sonate-green">{info.label}</p>
                <p className="text-xs text-sonate-muted">{info.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRun(type)}
                disabled={pending === type || !!disabledReason}
                title={disabledReason ?? undefined}
                className="shrink-0 rounded-full bg-sonate-orange px-3 py-1.5 text-xs font-semibold text-sonate-cream hover:bg-sonate-orange-dark disabled:opacity-50"
              >
                {pending === type ? "..." : run ? "Relancer" : "Enrichir"}
              </button>
            </div>
            {disabledReason && <p className="mt-1 text-xs text-sonate-muted">{disabledReason}</p>}
            {run && (
              <div className="mt-2 rounded-md bg-sonate-green/5 p-2 text-xs">
                {run.status === "failed" ? (
                  <p className="text-sonate-red">Échec : {run.errorMessage}</p>
                ) : (
                  summarize(type, run.resultData).map((line, i) => <p key={i} className="text-sonate-green">{line}</p>)
                )}
                <p className="mt-1 text-sonate-muted">
                  {new Date(run.createdAt).toLocaleString("fr-FR")}
                  {run.creditsUsed !== null && ` · ${run.creditsUsed} crédit${run.creditsUsed !== 1 ? "s" : ""}`}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
