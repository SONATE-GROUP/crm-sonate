import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const B2B_B2C_VALUES = ["b2b", "b2c", "mixte"] as const;
export type B2bB2c = (typeof B2B_B2C_VALUES)[number];

// "api" = lead créé via l'API d'ingestion live (Make/n8n), par opposition aux
// imports batch depuis les exports Notion des 3 sources historiques.
export const SOURCE_SYSTEM_VALUES = ["deuxio", "wedig", "letsclic", "api"] as const;
export type SourceSystem = (typeof SOURCE_SYSTEM_VALUES)[number];

export const ENRICHMENT_STATUS_VALUES = ["pending", "done", "failed"] as const;
export type EnrichmentStatus = (typeof ENRICHMENT_STATUS_VALUES)[number];

export const PENDING_LEAD_STATUS_VALUES = ["pending", "merged", "dismissed"] as const;
export type PendingLeadStatus = (typeof PENDING_LEAD_STATUS_VALUES)[number];

export const DEAL_STATUS_VALUES = [
  "devis_a_envoyer",
  "attente_retour_client",
  "non_pertinent",
  "perdu",
  "gagne",
  "a_relancer_plus_tard",
  "call_reserve",
  "devis_envoye",
  "audit_en_cours",
  "sans_rdv",
  "partenaire_potentiel",
  "lapin",
] as const;
export type DealStatus = (typeof DEAL_STATUS_VALUES)[number];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  devis_a_envoyer: "Devis à envoyer",
  attente_retour_client: "Attente retour client",
  non_pertinent: "Non pertinent",
  perdu: "Perdu",
  gagne: "Gagné",
  a_relancer_plus_tard: "A relancer plus tard",
  call_reserve: "Call réservé",
  devis_envoye: "Devis envoyé",
  audit_en_cours: "Audit en cours",
  sans_rdv: "Sans RDV",
  partenaire_potentiel: "Partenaire potentiel",
  lapin: "Lapin",
};

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  website: text("website"),
  sector: text("sector"),
  b2bB2c: text("b2b_b2c", { enum: B2B_B2C_VALUES }),
  linkedinUrl: text("linkedin_url"),
  sourceSystem: text("source_system", { enum: SOURCE_SYSTEM_VALUES }).notNull(),
  // Renseigné pour les entreprises créées via l'API live, en attendant l'appel
  // réel à Derrick App (cf. lib/enrichment.ts) : NULL pour les entreprises
  // importées en batch, jamais enrichies automatiquement.
  enrichmentStatus: text("enrichment_status", { enum: ENRICHMENT_STATUS_VALUES }),
  enrichmentData: text("enrichment_data"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const deals = sqliteTable("deals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  status: text("status", { enum: DEAL_STATUS_VALUES }),
  qualification: text("qualification"),
  score: integer("score"),
  montantDevis: real("montant_devis"),
  panierMoyen: text("panier_moyen"),
  caMensuel: text("ca_mensuel"),
  depenseMarketingMensuelle: text("depense_marketing_mensuelle"),
  besoinPrincipal: text("besoin_principal"),
  kpiCible: text("kpi_cible"),
  raisonDeRefus: text("raison_de_refus"),
  message: text("message"),
  owner: text("owner"),
  source: text("source"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * File d'attente de fusion : un lead entrant (API live) dont l'email ou le
 * nom d'entreprise correspond à une fiche déjà existante n'est jamais
 * fusionné automatiquement — il atterrit ici, avec le payload brut reçu, en
 * attendant qu'un utilisateur accepte ("Fusionner", cf. lib/actions.ts,
 * ajoute un nouveau deal) ou rejette ("Ignorer") la proposition.
 */
export const pendingLeads = sqliteTable("pending_leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchedCompanyId: integer("matched_company_id").references(() => companies.id),
  matchedContactId: integer("matched_contact_id").references(() => contacts.id),
  rawPayload: text("raw_payload").notNull(),
  status: text("status", { enum: PENDING_LEAD_STATUS_VALUES }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
});

/**
 * Clés API pour l'ingestion live (POST /api/leads), configurables par chaque
 * utilisateur depuis /settings plutôt que via une variable d'environnement
 * Netlify partagée. Seul le hash (SHA-256) est stocké — le hachage est
 * volontairement non salé/non-bcrypt : la clé en clair est un secret
 * aléatoire de haute entropie généré par nous (pas un mot de passe choisi
 * par un humain), donc un lookup direct par hash est sûr et permet une
 * vérification en O(1) au lieu de comparer contre chaque hash bcrypt stocké.
 * `keyPreview` (4 derniers caractères) permet à l'utilisateur de reconnaître
 * sa clé dans la liste sans jamais réafficher la valeur complète après sa
 * création.
 */
export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerEmail: text("owner_email").notNull(),
  label: text("label").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPreview: text("key_preview").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
});

export const INTEGRATION_PROVIDER_VALUES = ["derrick_app"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDER_VALUES)[number];

/** Identifiants d'intégrations tierces (ex. Derrick App), par utilisateur. */
export const integrationSettings = sqliteTable(
  "integration_settings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerEmail: text("owner_email").notNull(),
    provider: text("provider", { enum: INTEGRATION_PROVIDER_VALUES }).notNull(),
    value: text("value").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique().on(table.ownerEmail, table.provider)]
);
