import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { db } from "../db/client";
import { companies, contacts, deals, type DealStatus, type SourceSystem } from "../db/schema";
import { cleanText, normalizeCompanyKey, normalizeEmail } from "../lib/normalize";

// Le CLI ne couvre que les 3 sources historiques d'import batch — "api" (leads
// live via lib/ingest.ts) n'est délibérément pas accepté ici.
const CSV_SOURCE_SYSTEMS = ["deuxio", "wedig", "letsclic"] as const;
type CsvSourceSystem = (typeof CSV_SOURCE_SYSTEMS)[number];

// --- CLI args ---------------------------------------------------------------

function parseArgs(argv: string[]) {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = "true";
      }
    }
  }
  return parsed;
}

function requireArgs(): { csvPath: string; sourceSystem: SourceSystem } {
  const args = parseArgs(process.argv.slice(2));
  if (!args.csv || !args.source) {
    console.error(
      "Usage: tsx scripts/import.ts --csv <path/to/export.csv> --source <deuxio|wedig|letsclic>"
    );
    process.exit(1);
  }
  if (!CSV_SOURCE_SYSTEMS.includes(args.source as CsvSourceSystem)) {
    console.error(
      `--source invalide: "${args.source}". Valeurs acceptées: ${CSV_SOURCE_SYSTEMS.join(", ")}`
    );
    process.exit(1);
  }
  return { csvPath: args.csv, sourceSystem: args.source as SourceSystem };
}

const { csvPath, sourceSystem } = requireArgs();

// --- Normalisation helpers ---------------------------------------------------
// cleanText / normalizeEmail / normalizeCompanyKey viennent de lib/normalize.ts
// (partagées avec l'ingestion live, cf. lib/ingest.ts).

const B2B_B2C_MAP: Record<string, "b2b" | "b2c" | "mixte"> = {
  b2b: "b2b",
  b2c: "b2c",
  "les 2 (b2b et b2c)": "mixte",
};

function normalizeB2bB2c(value: string | undefined): "b2b" | "b2c" | "mixte" | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  return B2B_B2C_MAP[cleaned.toLowerCase()] ?? null;
}

// Le Status "brut" du CSV -> slug de l'enum deals.status.
const STATUS_MAP: Record<string, DealStatus> = {
  "devis à envoyer": "devis_a_envoyer",
  "attente retour client": "attente_retour_client",
  "non pertinent": "non_pertinent",
  perdu: "perdu",
  gagné: "gagne",
  "a relancer plus tard": "a_relancer_plus_tard",
  "call réservé": "call_reserve",
  "devis envoyé": "devis_envoye",
  "audit en cours": "audit_en_cours",
  "sans rdv": "sans_rdv",
  "partenaire potentiel": "partenaire_potentiel",
  lapin: "lapin",
};

function normalizeStatus(
  value: string | undefined,
  unrecognized: Map<string, number>
): DealStatus | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const slug = STATUS_MAP[cleaned.toLowerCase()];
  if (!slug) {
    unrecognized.set(cleaned, (unrecognized.get(cleaned) ?? 0) + 1);
    return null;
  }
  return slug;
}

/**
 * Qualification / Qualification 1 / Qualification 2 sont 3 colonnes Notion
 * redondantes (la même question recréée plusieurs fois côté Notion). On
 * garde la première valeur non vide, dans l'ordre où les colonnes sont
 * effectivement remplies sur ce jeu de données (Qualification, puis
 * Qualification 2, puis Qualification 1 en dernier recours).
 */
function pickQualification(row: Row): string | null {
  return (
    cleanText(row["Qualification"]) ??
    cleanText(row["Qualification 2"]) ??
    cleanText(row["Qualification 1"])
  );
}

/** "0,00 €" / "1 234,50 €" -> 0 / 1234.5 */
function parseMontant(value: string | undefined): number | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const numeric = cleaned
    .replace(/[€\s ]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseScore(value: string | undefined): number | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * "15/03/2025" -> Date. Utilisée comme date de création: l'export Notion n'a
 * pas de colonne "created at" dédiée, "Remplissage form" (date à laquelle le
 * prospect a rempli le formulaire) en est le meilleur proxy disponible.
 */
function parseFrenchDate(value: string | undefined): Date | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Valeurs "propres" connues de la colonne Source, utilisées pour ramener les
 * variantes libres (casse, synonymes, valeurs collées deux fois) à une valeur
 * canonique. Toute valeur qui ne correspond à aucune règle est conservée
 * telle quelle plutôt que d'être devinée (comptée dans le rapport final).
 */
const SOURCE_RULES: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /chatgpt|chat gpt|\bgpt\b|gemini|perplexity/i, canonical: "IA (ChatGPT / Gemini...)" },
  { pattern: /seo|r[ée]f[ée]rencement naturel/i, canonical: "SEO / Référencement Naturel" },
  { pattern: /recommandation/i, canonical: "Recommandation" },
  { pattern: /publicit[ée]|google ads|meta ads|facebook ads/i, canonical: "Publicité (Google Ads...)" },
  { pattern: /linkedin/i, canonical: "Linkedin" },
  { pattern: /communaut[ée]|forum growth/i, canonical: "Communauté / Forum Growth" },
  { pattern: /notre blog|^blog$/i, canonical: "Notre Blog" },
  { pattern: /newsletter/i, canonical: "Newsletter" },
  { pattern: /recherche|google|internet|moteur de recherche/i, canonical: "Recherche internet / Google" },
  { pattern: /^\.+$|^test$/i, canonical: "" },
];

function normalizeSource(value: string | undefined, others: Map<string, number>): string | null {
  let cleaned = cleanText(value);
  if (!cleaned) return null;

  // Valeurs Notion collées deux fois de suite ("SEOSEO", "RecommandationRecommandation").
  if (cleaned.length % 2 === 0) {
    const half = cleaned.length / 2;
    const first = cleaned.slice(0, half).trim();
    const second = cleaned.slice(half).trim();
    if (first.length > 0 && first.toLowerCase() === second.toLowerCase()) {
      cleaned = first;
    }
  }

  for (const rule of SOURCE_RULES) {
    if (rule.pattern.test(cleaned)) {
      return rule.canonical.length > 0 ? rule.canonical : null;
    }
  }

  others.set(cleaned, (others.get(cleaned) ?? 0) + 1);
  return cleaned;
}

// --- Import -------------------------------------------------------------

type Row = Record<string, string>;

/**
 * Précharge les entreprises et contacts déjà en base et les indexe avec la
 * même clé de normalisation que celle utilisée pour le fichier en cours.
 * Nécessaire pour que le script reste idempotent (ré-exécutable / composable
 * entre plusieurs imports de sources différentes) sans dépendre d'un
 * dédoublonnage SQL moins strict (accents/ponctuation) que celui en mémoire.
 */
async function preloadExisting() {
  const companyIdByKey = new Map<string, number>();
  for (const row of await db.select({ id: companies.id, name: companies.name }).from(companies)) {
    companyIdByKey.set(normalizeCompanyKey(row.name), row.id);
  }

  const contactIdByCompanyAndEmail = new Map<string, number>();
  for (const row of await db
    .select({ id: contacts.id, companyId: contacts.companyId, email: contacts.email })
    .from(contacts)) {
    if (row.email) {
      contactIdByCompanyAndEmail.set(`${row.companyId}:${row.email.toLowerCase()}`, row.id);
    }
  }

  return { companyIdByKey, contactIdByCompanyAndEmail };
}

async function main() {
  const raw = readFileSync(csvPath, "utf-8");
  const rows: Row[] = parse(raw, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });

  console.log(`Fichier: ${csvPath}`);
  console.log(`Source système: ${sourceSystem}`);
  console.log(`Lignes lues: ${rows.length}\n`);

  const { companyIdByKey, contactIdByCompanyAndEmail } = await preloadExisting();

  let dealsCreated = 0;
  let companiesCreated = 0;
  let contactsCreated = 0;
  let companyDuplicateRows = 0;
  let contactDuplicateRows = 0;
  let ignoredNoName = 0;
  const unrecognizedStatuses = new Map<string, number>();
  const otherSources = new Map<string, number>();

  for (const row of rows) {
    const companyName = cleanText(row["Name"]);
    if (!companyName) {
      ignoredNoName++;
      continue;
    }

    const rowDate = parseFrenchDate(row["Remplissage form"]) ?? new Date();
    const companyKey = normalizeCompanyKey(companyName);

    let companyId = companyIdByKey.get(companyKey);
    if (companyId === undefined) {
      const [created] = await db
        .insert(companies)
        .values({
          name: companyName,
          website: cleanText(row["Website"]),
          sector: cleanText(row["Secteur"]),
          b2bB2c: normalizeB2bB2c(row["B2B/B2C"]),
          linkedinUrl: cleanText(row["Linkedin"]),
          sourceSystem,
          createdAt: rowDate,
        })
        .returning({ id: companies.id });
      companyId = created.id;
      companiesCreated++;
      companyIdByKey.set(companyKey, companyId);
    } else {
      companyDuplicateRows++;
    }

    const contactName = cleanText(row["Contact"]) ?? "Inconnu";
    const email = normalizeEmail(row["Contact Email"]);
    const contactCacheKey = `${companyId}:${email ?? `noemail:${contactName.toLowerCase()}`}`;

    let contactId = contactIdByCompanyAndEmail.get(contactCacheKey);
    if (contactId === undefined) {
      const [created] = await db
        .insert(contacts)
        .values({
          companyId,
          fullName: contactName,
          email,
          phone: cleanText(row["Contact Phone"]),
          role: cleanText(row["Contact Role"]),
          createdAt: rowDate,
        })
        .returning({ id: contacts.id });
      contactId = created.id;
      contactsCreated++;
      contactIdByCompanyAndEmail.set(contactCacheKey, contactId);
    } else {
      contactDuplicateRows++;
    }

    await db.insert(deals).values({
      companyId,
      status: normalizeStatus(row["Status"], unrecognizedStatuses),
      qualification: pickQualification(row),
      score: parseScore(row["Score"]),
      montantDevis: parseMontant(row["Montant Devis"]),
      panierMoyen: cleanText(row["Panier moyen"]),
      caMensuel: cleanText(row["CA mensuel"]),
      depenseMarketingMensuelle: cleanText(row["Dépense marketing mensuelle"]),
      besoinPrincipal: cleanText(row["Besoin principal"]),
      kpiCible: cleanText(row["KPI Cible"]),
      raisonDeRefus: cleanText(row["Raison de refus"]),
      message: cleanText(row["Message"]),
      owner: cleanText(row["Owner"]),
      source: normalizeSource(row["Source"], otherSources),
      createdAt: rowDate,
      updatedAt: rowDate,
    });
    dealsCreated++;
  }

  console.log("--- Rapport d'import ---");
  console.log(`Lignes lues                 : ${rows.length}`);
  console.log(`Lignes importées (deals)    : ${dealsCreated}`);
  console.log(`Lignes ignorées (sans nom)  : ${ignoredNoName}`);
  console.log(`Doublons entreprise (nom réutilisé) : ${companyDuplicateRows} (${companiesCreated} entreprises créées)`);
  console.log(`Doublons contact (email réutilisé)  : ${contactDuplicateRows} (${contactsCreated} contacts créés)`);

  if (unrecognizedStatuses.size > 0) {
    console.log("\nStatuts non reconnus (mis à NULL) :");
    for (const [value, count] of unrecognizedStatuses) {
      console.log(`  "${value}" x${count}`);
    }
  }

  if (otherSources.size > 0) {
    console.log(
      `\nValeurs de Source non catégorisées (conservées telles quelles) : ${otherSources.size} valeurs distinctes`
    );
    for (const [value, count] of otherSources) {
      console.log(`  "${value}" x${count}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
