import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const B2B_B2C_VALUES = ["b2b", "b2c", "mixte"] as const;
export type B2bB2c = (typeof B2B_B2C_VALUES)[number];

export const SOURCE_SYSTEM_VALUES = ["deuxio", "wedig", "letsclic"] as const;
export type SourceSystem = (typeof SOURCE_SYSTEM_VALUES)[number];

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
