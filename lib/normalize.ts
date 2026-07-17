/**
 * Normalisation partagée entre le script d'import batch (scripts/import.ts)
 * et l'ingestion live (lib/ingest.ts) — la même notion de "doublon" doit
 * s'appliquer aux deux, sinon un lead entrant par API pourrait dédupliquer
 * différemment de l'import CSV historique.
 */

export function cleanText(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** lower/trim, pour dédoublonnage d'emails. */
export function normalizeEmail(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Clé de dédoublonnage des entreprises: minuscule, accents/espaces/ponctuation
 * retirés entièrement (pas juste collapsés) pour que "Cap Bornes" et
 * "Capbornes" tombent sur la même clé. "@" est développé en "at" ("Wecare@work"
 * ~ "wecareatwork"), et le marqueur manuel "doublon" parfois collé au nom
 * ("Special Menuiseries / Doublon") est retiré avant normalisation.
 */
export function normalizeCompanyKey(value: string): string {
  return value
    .replace(/@/g, " at ")
    .replace(/\bdoublon\b/gi, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
