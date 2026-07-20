"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ENRICHMENT_TYPE_INFO, type EnrichmentEntityType, type EnrichmentType } from "@/db/schema";
import { runEnrichment } from "@/lib/manual-enrichment";

// Derrick App limite à 60 requêtes/minute, tous endpoints confondus, par clé
// API : un délai d'environ 1,1s entre deux appels reste sous la limite avec
// une marge de sécurité, y compris quand un type d'enrichissement fait 2
// appels Derrick pour une seule fiche (ex. linkedin_company).
const DELAY_BETWEEN_CALLS_MS = 1100;

export function BulkEnrichBar({
  entityType,
  selectedIds,
  onClear,
}: {
  entityType: EnrichmentEntityType;
  selectedIds: number[];
  onClear: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<EnrichmentType | "">("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; failed: number; total: number } | null>(null);
  const cancelRef = useRef(false);

  const types = (Object.keys(ENRICHMENT_TYPE_INFO) as EnrichmentType[]).filter(
    (t) => ENRICHMENT_TYPE_INFO[t].entityType === entityType
  );

  async function handleStart() {
    if (!type) return;
    const info = ENRICHMENT_TYPE_INFO[type];
    const maxCost = selectedIds.length * info.maxCredits;
    const confirmed = window.confirm(
      `Ceci va lancer "${info.label}" sur ${selectedIds.length} fiche${selectedIds.length > 1 ? "s" : ""}, jusqu'à ${maxCost} crédits Derrick App au total. Continuer ?`
    );
    if (!confirmed) return;

    cancelRef.current = false;
    setRunning(true);
    setProgress({ done: 0, failed: 0, total: selectedIds.length });

    let done = 0;
    let failed = 0;
    for (const id of selectedIds) {
      if (cancelRef.current) break;
      const result = await runEnrichment(entityType, id, type);
      if (result.status === "done") done += 1;
      else failed += 1;
      setProgress({ done, failed, total: selectedIds.length });
      if (!cancelRef.current) await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
    }

    setRunning(false);
    router.refresh();
  }

  function handleCancel() {
    cancelRef.current = true;
  }

  function handleClose() {
    setProgress(null);
    setType("");
    onClear();
  }

  return (
    <div className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-sonate-green/15 bg-white p-4 shadow-lg">
      <span className="text-sm font-semibold text-sonate-green">
        {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
      </span>

      {!progress && (
        <>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EnrichmentType)}
            className="rounded-lg border border-sonate-green/15 bg-white px-2 py-1.5 text-sm text-sonate-green"
          >
            <option value="">Choisir un enrichissement…</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {ENRICHMENT_TYPE_INFO[t].label} (jusqu&apos;à {ENRICHMENT_TYPE_INFO[t].maxCredits} cr./fiche)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleStart}
            disabled={!type}
            className="rounded-full bg-sonate-orange px-4 py-1.5 text-sm font-semibold text-sonate-cream hover:bg-sonate-orange-dark disabled:opacity-50"
          >
            Enrichir la sélection
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-sonate-green/20 px-4 py-1.5 text-sm font-semibold text-sonate-green"
          >
            Annuler la sélection
          </button>
        </>
      )}

      {progress && (
        <>
          <span className="text-sm text-sonate-muted">
            {progress.done + progress.failed} / {progress.total} traité{progress.total > 1 ? "s" : ""}
            {progress.failed > 0 && ` (${progress.failed} échec${progress.failed > 1 ? "s" : ""})`}
          </span>
          {running ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-sonate-red/30 px-4 py-1.5 text-sm font-semibold text-sonate-red"
            >
              Arrêter
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-sonate-green/20 px-4 py-1.5 text-sm font-semibold text-sonate-green"
            >
              Fermer
            </button>
          )}
        </>
      )}
    </div>
  );
}
