import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  apiKeys,
  companies,
  contacts,
  conversationMessages,
  deals,
  integrationSettings,
  pendingLeads,
  users,
  workspaceMembers,
  workspaces,
  type DealStatus,
  type B2bB2c,
  type IntegrationProvider,
  type SourceSystem,
} from "@/db/schema";

export const PAGE_SIZE = 50;

/**
 * Périmètre d'accès de l'utilisateur courant (cf. lib/session.ts) : un admin
 * voit tout, un utilisateur normal ne voit que les entreprises (et
 * contacts/deals hérités) rattachées à un de ses espaces. Requis sur toutes
 * les requêtes de liste/détail/stats pour ne jamais oublier le filtrage.
 */
export type Scope = { isAdmin: boolean; workspaceIds: number[] };

/** Condition SQL à ajouter sur `companies.workspaceId` (ou une jointure vers companies) selon le périmètre. */
function scopeCondition(scope: Scope) {
  if (scope.isAdmin) return undefined;
  if (scope.workspaceIds.length === 0) return sql`0 = 1`;
  return inArray(companies.workspaceId, scope.workspaceIds);
}

// Les données changent maintenant aussi via l'ingestion live (lib/ingest.ts)
// et les actions de fusion (lib/actions.ts), en plus du script d'import batch.
// Un court cache reste pertinent (l'appli reste très majoritairement en
// lecture), mais toute mutation doit invalider ce tag pour rester cohérente
// avant l'expiration des 30s — cf. revalidateTag("crm-data") côté écriture.
const REVALIDATE_SECONDS = 30;
const CACHE_TAGS = ["crm-data"];

export type DealListFilters = {
  q?: string;
  status?: DealStatus;
  b2bB2c?: B2bB2c;
  owner?: string;
  scoreMin?: number;
  /** Format "YYYY-MM-DD", borne incluse sur deals.createdAt. */
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  scope: Scope;
};

export type DealKanbanFilters = Omit<DealListFilters, "status" | "page">;

/** CTE: un contact "représentatif" (le premier créé) par entreprise. */
function contactPerCompanyCte() {
  return db.$with("contact_per_company").as(
    db
      .select({
        companyId: contacts.companyId,
        contactId: sql<number>`min(${contacts.id})`.as("contact_id"),
      })
      .from(contacts)
      .groupBy(contacts.companyId)
  );
}

function buildDealsWhere(filters: DealListFilters) {
  const conditions = [];

  if (filters.q) {
    const term = `%${filters.q.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${companies.name})`, term),
        like(sql`lower(${contacts.fullName})`, term),
        like(sql`lower(${contacts.email})`, term)
      )
    );
  }
  if (filters.status) conditions.push(eq(deals.status, filters.status));
  if (filters.b2bB2c) conditions.push(eq(companies.b2bB2c, filters.b2bB2c));
  if (filters.owner) conditions.push(eq(deals.owner, filters.owner));
  if (filters.scoreMin !== undefined) conditions.push(gte(deals.score, filters.scoreMin));
  if (filters.dateFrom) conditions.push(gte(deals.createdAt, new Date(`${filters.dateFrom}T00:00:00`)));
  if (filters.dateTo) conditions.push(lte(deals.createdAt, new Date(`${filters.dateTo}T23:59:59`)));
  const scoped = scopeCondition(filters.scope);
  if (scoped) conditions.push(scoped);

  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function _listDeals(filters: DealListFilters) {
  const cpc = contactPerCompanyCte();
  const page = Math.max(1, filters.page ?? 1);
  const where = buildDealsWhere(filters);

  const [rows, countRows] = await Promise.all([
    db
      .with(cpc)
      .select({
        id: deals.id,
        status: deals.status,
        score: deals.score,
        owner: deals.owner,
        createdAt: deals.createdAt,
        companyId: companies.id,
        companyName: companies.name,
        b2bB2c: companies.b2bB2c,
        contactFullName: contacts.fullName,
        contactEmail: contacts.email,
      })
      .from(deals)
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .leftJoin(cpc, eq(cpc.companyId, companies.id))
      .leftJoin(contacts, eq(contacts.id, cpc.contactId))
      .where(where)
      .orderBy(desc(deals.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .with(cpc)
      .select({ count: sql<number>`count(*)` })
      .from(deals)
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .leftJoin(cpc, eq(cpc.companyId, companies.id))
      .leftJoin(contacts, eq(contacts.id, cpc.contactId))
      .where(where),
  ]);

  const count = countRows[0].count;
  return { rows, total: count, page, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}
export const listDeals = unstable_cache(_listDeals, ["list-deals"], { revalidate: REVALIDATE_SECONDS, tags: CACHE_TAGS });

/**
 * Toutes les deals correspondant aux filtres, tous statuts confondus et sans
 * pagination — pour le board kanban qui les répartit lui-même par colonne
 * (statut). Acceptable tant que le volume reste de l'ordre du millier de
 * deals ; à revoir (chargement par colonne) si ça grossit significativement.
 */
async function _listDealsForKanban(filters: DealKanbanFilters) {
  const cpc = contactPerCompanyCte();
  const where = buildDealsWhere(filters);

  return db
    .with(cpc)
    .select({
      id: deals.id,
      status: deals.status,
      score: deals.score,
      owner: deals.owner,
      montantDevis: deals.montantDevis,
      createdAt: deals.createdAt,
      companyId: companies.id,
      companyName: companies.name,
      b2bB2c: companies.b2bB2c,
      contactFullName: contacts.fullName,
      contactEmail: contacts.email,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(cpc, eq(cpc.companyId, companies.id))
    .leftJoin(contacts, eq(contacts.id, cpc.contactId))
    .where(where)
    .orderBy(desc(deals.createdAt));
}
export const listDealsForKanban = unstable_cache(_listDealsForKanban, ["list-deals-kanban"], {
  revalidate: REVALIDATE_SECONDS,
  tags: CACHE_TAGS,
});
export type KanbanDeal = Awaited<ReturnType<typeof _listDealsForKanban>>[number];

async function _listOwners(scope: Scope) {
  const scoped = scopeCondition(scope);
  const where = scoped ? and(sql`${deals.owner} is not null`, scoped) : sql`${deals.owner} is not null`;
  const rows = await db
    .select({ owner: deals.owner })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(where)
    .groupBy(deals.owner)
    .orderBy(asc(deals.owner));
  return rows.map((r) => r.owner!).filter(Boolean);
}
export const listOwners = unstable_cache(_listOwners, ["list-owners"], { revalidate: REVALIDATE_SECONDS, tags: CACHE_TAGS });

export type CompanyListFilters = {
  q?: string;
  b2bB2c?: B2bB2c;
  sourceSystem?: SourceSystem;
  page?: number;
  scope: Scope;
};

function buildCompaniesWhere(filters: CompanyListFilters) {
  const conditions = [];
  if (filters.q) {
    const term = `%${filters.q.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${companies.name})`, term),
        like(sql`lower(${companies.website})`, term),
        like(sql`lower(${companies.sector})`, term)
      )
    );
  }
  if (filters.b2bB2c) conditions.push(eq(companies.b2bB2c, filters.b2bB2c));
  if (filters.sourceSystem) conditions.push(eq(companies.sourceSystem, filters.sourceSystem));
  const scoped = scopeCondition(filters.scope);
  if (scoped) conditions.push(scoped);
  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function _listCompanies(filters: CompanyListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildCompaniesWhere(filters);

  const dealCount = db.$with("deal_count").as(
    db.select({ companyId: deals.companyId, dealN: sql<number>`count(*)`.as("deal_n") }).from(deals).groupBy(deals.companyId)
  );
  const contactCount = db.$with("contact_count").as(
    db.select({ companyId: contacts.companyId, contactN: sql<number>`count(*)`.as("contact_n") }).from(contacts).groupBy(contacts.companyId)
  );
  const pendingCount = db.$with("pending_count").as(
    db
      .select({ companyId: pendingLeads.matchedCompanyId, pendingN: sql<number>`count(*)`.as("pending_n") })
      .from(pendingLeads)
      .where(eq(pendingLeads.status, "pending"))
      .groupBy(pendingLeads.matchedCompanyId)
  );

  const [rows, countRows] = await Promise.all([
    db
      .with(dealCount, contactCount, pendingCount)
      .select({
        id: companies.id,
        name: companies.name,
        website: companies.website,
        sector: companies.sector,
        b2bB2c: companies.b2bB2c,
        sourceSystem: companies.sourceSystem,
        createdAt: companies.createdAt,
        dealsCount: sql<number>`coalesce(${dealCount.dealN}, 0)`,
        contactsCount: sql<number>`coalesce(${contactCount.contactN}, 0)`,
        pendingCount: sql<number>`coalesce(${pendingCount.pendingN}, 0)`,
      })
      .from(companies)
      .leftJoin(dealCount, eq(dealCount.companyId, companies.id))
      .leftJoin(contactCount, eq(contactCount.companyId, companies.id))
      .leftJoin(pendingCount, eq(pendingCount.companyId, companies.id))
      .where(where)
      .orderBy(desc(companies.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)` }).from(companies).where(where),
  ]);

  const count = countRows[0].count;
  return { rows, total: count, page, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}
export const listCompanies = unstable_cache(_listCompanies, ["list-companies"], { revalidate: REVALIDATE_SECONDS, tags: CACHE_TAGS });
export type CompanyRow = Awaited<ReturnType<typeof _listCompanies>>["rows"][number];

export type PendingLead = {
  id: number;
  matchedContactId: number | null;
  createdAt: Date;
  payload: import("@/lib/ingest").LeadPayload;
};

function canAccessWorkspace(scope: Scope, workspaceId: number | null): boolean {
  if (scope.isAdmin) return true;
  return workspaceId !== null && scope.workspaceIds.includes(workspaceId);
}

async function _getCompanyDetail(id: number, scope: Scope) {
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company || !canAccessWorkspace(scope, company.workspaceId)) return null;

  const [companyContacts, companyDeals, pending] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.companyId, id)).orderBy(asc(contacts.id)),
    db.select().from(deals).where(eq(deals.companyId, id)).orderBy(desc(deals.createdAt)),
    db
      .select()
      .from(pendingLeads)
      .where(and(eq(pendingLeads.matchedCompanyId, id), eq(pendingLeads.status, "pending")))
      .orderBy(desc(pendingLeads.createdAt)),
  ]);

  const pendingParsed: PendingLead[] = pending.map((p) => ({
    id: p.id,
    matchedContactId: p.matchedContactId,
    createdAt: p.createdAt,
    payload: JSON.parse(p.rawPayload),
  }));

  return { company, contacts: companyContacts, deals: companyDeals, pendingLeads: pendingParsed };
}
export const getCompanyDetail = unstable_cache(_getCompanyDetail, ["get-company-detail"], {
  revalidate: REVALIDATE_SECONDS,
  tags: CACHE_TAGS,
});

export type ContactListFilters = {
  q?: string;
  page?: number;
  scope: Scope;
};

function buildContactsWhere(filters: ContactListFilters) {
  const conditions = [];
  if (filters.q) {
    const term = `%${filters.q.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${contacts.fullName})`, term),
        like(sql`lower(${contacts.email})`, term),
        like(sql`lower(${contacts.phone})`, term),
        like(sql`lower(${companies.name})`, term)
      )
    );
  }
  const scoped = scopeCondition(filters.scope);
  if (scoped) conditions.push(scoped);
  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function _listContacts(filters: ContactListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildContactsWhere(filters);

  const pendingCount = db.$with("pending_count").as(
    db
      .select({ contactId: pendingLeads.matchedContactId, pendingN: sql<number>`count(*)`.as("pending_n") })
      .from(pendingLeads)
      .where(eq(pendingLeads.status, "pending"))
      .groupBy(pendingLeads.matchedContactId)
  );

  const [rows, countRows] = await Promise.all([
    db
      .with(pendingCount)
      .select({
        id: contacts.id,
        fullName: contacts.fullName,
        email: contacts.email,
        phone: contacts.phone,
        role: contacts.role,
        companyId: companies.id,
        companyName: companies.name,
        pendingCount: sql<number>`coalesce(${pendingCount.pendingN}, 0)`,
        aiTemperature: contacts.aiTemperature,
      })
      .from(contacts)
      .innerJoin(companies, eq(contacts.companyId, companies.id))
      .leftJoin(pendingCount, eq(pendingCount.contactId, contacts.id))
      .where(where)
      .orderBy(asc(contacts.fullName))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .innerJoin(companies, eq(contacts.companyId, companies.id))
      .where(where),
  ]);

  const count = countRows[0].count;
  return { rows, total: count, page, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}
export const listContacts = unstable_cache(_listContacts, ["list-contacts"], { revalidate: REVALIDATE_SECONDS, tags: CACHE_TAGS });
export type ContactRow = Awaited<ReturnType<typeof _listContacts>>["rows"][number];

async function _getContactDetail(id: number, scope: Scope) {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) return null;

  const [company, companyDeals] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, contact.companyId)).limit(1).then((r) => r[0]),
    db.select().from(deals).where(eq(deals.companyId, contact.companyId)).orderBy(desc(deals.createdAt)),
  ]);
  if (!canAccessWorkspace(scope, company?.workspaceId ?? null)) return null;

  return { contact, company, deals: companyDeals };
}
export const getContactDetail = unstable_cache(_getContactDetail, ["get-contact-detail"], {
  revalidate: REVALIDATE_SECONDS,
  tags: CACHE_TAGS,
});

async function _getConversationsForContact(contactId: number) {
  return db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.contactId, contactId))
    .orderBy(asc(conversationMessages.sentAt));
}
export const getConversationsForContact = unstable_cache(_getConversationsForContact, ["get-contact-conversations"], {
  revalidate: REVALIDATE_SECONDS,
  tags: CACHE_TAGS,
});
export type ConversationMessage = Awaited<ReturnType<typeof _getConversationsForContact>>[number];

async function _getDealDetail(id: number, scope: Scope) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) return null;

  const [company, companyDeals, companyContacts] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, deal.companyId)).limit(1).then((r) => r[0]),
    db.select().from(deals).where(eq(deals.companyId, deal.companyId)).orderBy(desc(deals.createdAt)),
    db.select().from(contacts).where(eq(contacts.companyId, deal.companyId)).orderBy(asc(contacts.id)),
  ]);
  if (!canAccessWorkspace(scope, company?.workspaceId ?? null)) return null;

  return { deal, company, contacts: companyContacts, otherDeals: companyDeals.filter((d) => d.id !== id) };
}
export const getDealDetail = unstable_cache(_getDealDetail, ["get-deal-detail"], { revalidate: REVALIDATE_SECONDS, tags: CACHE_TAGS });

function toDate(epochSeconds: number | null): Date | null {
  return epochSeconds !== null ? new Date(epochSeconds * 1000) : null;
}

export type DealStats = { total: number; gagne: number; perdu: number; avgScore: number | null; lastImport: Date | null };

async function _getDealStats(scope: Scope): Promise<DealStats> {
  const scoped = scopeCondition(scope);
  const query = db
    .select({
      total: sql<number>`count(*)`,
      gagne: sql<number>`sum(case when ${deals.status} = 'gagne' then 1 else 0 end)`,
      perdu: sql<number>`sum(case when ${deals.status} = 'perdu' then 1 else 0 end)`,
      avgScore: sql<number | null>`avg(${deals.score})`,
      lastImport: sql<number | null>`max(${deals.createdAt})`,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id));
  const [row] = scoped ? await query.where(scoped) : await query;
  return {
    total: row.total,
    gagne: row.gagne,
    perdu: row.perdu,
    avgScore: row.avgScore !== null ? Math.round(row.avgScore * 10) / 10 : null,
    lastImport: toDate(row.lastImport),
  };
}
export const getDealStats = unstable_cache(_getDealStats, ["deal-stats"], { revalidate: REVALIDATE_SECONDS, tags: CACHE_TAGS });

export type CompanyStats = {
  total: number;
  totalContacts: number;
  b2b: number;
  b2c: number;
  mixte: number;
  lastImport: Date | null;
};

async function _getCompanyStats(scope: Scope): Promise<CompanyStats> {
  const scoped = scopeCondition(scope);
  const companyQuery = db
    .select({
      total: sql<number>`count(*)`,
      b2b: sql<number>`sum(case when ${companies.b2bB2c} = 'b2b' then 1 else 0 end)`,
      b2c: sql<number>`sum(case when ${companies.b2bB2c} = 'b2c' then 1 else 0 end)`,
      mixte: sql<number>`sum(case when ${companies.b2bB2c} = 'mixte' then 1 else 0 end)`,
      lastImport: sql<number | null>`max(${companies.createdAt})`,
    })
    .from(companies);
  const contactQuery = db
    .select({ totalContacts: sql<number>`count(*)` })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id));
  const [[row], [{ totalContacts }]] = await Promise.all([
    scoped ? companyQuery.where(scoped) : companyQuery,
    scoped ? contactQuery.where(scoped) : contactQuery,
  ]);
  return {
    total: row.total,
    totalContacts,
    b2b: row.b2b,
    b2c: row.b2c,
    mixte: row.mixte,
    lastImport: toDate(row.lastImport),
  };
}
export const getCompanyStats = unstable_cache(_getCompanyStats, ["company-stats"], { revalidate: REVALIDATE_SECONDS, tags: CACHE_TAGS });

export type ContactStats = { total: number; withEmail: number; withPhone: number; lastImport: Date | null };

async function _getContactStats(scope: Scope): Promise<ContactStats> {
  const scoped = scopeCondition(scope);
  const query = db
    .select({
      total: sql<number>`count(*)`,
      withEmail: sql<number>`sum(case when ${contacts.email} is not null then 1 else 0 end)`,
      withPhone: sql<number>`sum(case when ${contacts.phone} is not null then 1 else 0 end)`,
      lastImport: sql<number | null>`max(${contacts.createdAt})`,
    })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id));
  const [row] = scoped ? await query.where(scoped) : await query;
  return {
    total: row.total,
    withEmail: row.withEmail,
    withPhone: row.withPhone,
    lastImport: toDate(row.lastImport),
  };
}
export const getContactStats = unstable_cache(_getContactStats, ["contact-stats"], { revalidate: REVALIDATE_SECONDS, tags: CACHE_TAGS });

// Pas de unstable_cache sur les requêtes de /settings : page peu visitée,
// par utilisateur, et on préfère la fraîcheur immédiate après création/
// révocation d'une clé à un léger gain de perf sur une page à faible trafic.

export async function listApiKeysForOwner(ownerEmail: string) {
  return db
    .select({
      id: apiKeys.id,
      label: apiKeys.label,
      keyPreview: apiKeys.keyPreview,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      workspaceId: apiKeys.workspaceId,
      workspaceName: workspaces.name,
    })
    .from(apiKeys)
    .leftJoin(workspaces, eq(workspaces.id, apiKeys.workspaceId))
    .where(eq(apiKeys.ownerEmail, ownerEmail))
    .orderBy(desc(apiKeys.createdAt));
}

/** Espaces auxquels l'utilisateur a accès (tous si admin, ses memberships sinon) — pour les sélecteurs d'espace côté UI. */
export async function listWorkspacesForScope(scope: Scope) {
  if (scope.isAdmin) {
    return db.select({ id: workspaces.id, name: workspaces.name }).from(workspaces).orderBy(asc(workspaces.name));
  }
  if (scope.workspaceIds.length === 0) return [];
  return db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(inArray(workspaces.id, scope.workspaceIds))
    .orderBy(asc(workspaces.name));
}

export async function getIntegrationSettingForOwner(ownerEmail: string, provider: IntegrationProvider) {
  const [row] = await db
    .select({ value: integrationSettings.value, updatedAt: integrationSettings.updatedAt })
    .from(integrationSettings)
    .where(and(eq(integrationSettings.ownerEmail, ownerEmail), eq(integrationSettings.provider, provider)));
  return row ?? null;
}

// Pas de unstable_cache sur les requêtes utilisateurs/espaces : pages admin à
// faible trafic, la fraîcheur immédiate après création/modification prime.

export async function listUsers() {
  return db
    .select({ id: users.id, email: users.email, fullName: users.fullName, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.email));
}

export async function getUserByEmail(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

export async function listWorkspaces() {
  const memberCount = db.$with("member_count").as(
    db
      .select({ workspaceId: workspaceMembers.workspaceId, memberN: sql<number>`count(*)`.as("member_n") })
      .from(workspaceMembers)
      .groupBy(workspaceMembers.workspaceId)
  );
  const companyCount = db.$with("company_count").as(
    db
      .select({ workspaceId: companies.workspaceId, companyN: sql<number>`count(*)`.as("company_n") })
      .from(companies)
      .where(sql`${companies.workspaceId} is not null`)
      .groupBy(companies.workspaceId)
  );
  return db
    .with(memberCount, companyCount)
    .select({
      id: workspaces.id,
      name: workspaces.name,
      createdAt: workspaces.createdAt,
      membersCount: sql<number>`coalesce(${memberCount.memberN}, 0)`,
      companiesCount: sql<number>`coalesce(${companyCount.companyN}, 0)`,
    })
    .from(workspaces)
    .leftJoin(memberCount, eq(memberCount.workspaceId, workspaces.id))
    .leftJoin(companyCount, eq(companyCount.workspaceId, workspaces.id))
    .orderBy(asc(workspaces.name));
}

export async function getWorkspaceDetail(id: number) {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  if (!workspace) return null;

  const [members, workspaceCompanies] = await Promise.all([
    db
      .select({
        membershipId: workspaceMembers.id,
        role: workspaceMembers.role,
        userId: users.id,
        email: users.email,
        fullName: users.fullName,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, id))
      .orderBy(asc(users.email)),
    db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.workspaceId, id)).orderBy(asc(companies.name)),
  ]);

  return { workspace, members, companies: workspaceCompanies };
}

/** Toutes les entreprises avec leur espace actuel (ou aucun) — pour l'écran d'assignation. */
export async function listCompaniesForWorkspaceAssignment() {
  return db
    .select({ id: companies.id, name: companies.name, workspaceId: companies.workspaceId })
    .from(companies)
    .orderBy(asc(companies.name));
}

/**
 * Une intégration n'a pas de "propriétaire" naturel côté enrichissement en
 * tâche de fond (déclenché par un webhook, pas par un utilisateur connecté) :
 * on utilise la clé la plus récemment configurée pour ce provider, peu
 * importe qui l'a saisie.
 */
export async function getAnyIntegrationSetting(provider: IntegrationProvider): Promise<string | null> {
  const [row] = await db
    .select({ value: integrationSettings.value })
    .from(integrationSettings)
    .where(eq(integrationSettings.provider, provider))
    .orderBy(desc(integrationSettings.updatedAt))
    .limit(1);
  return row?.value ?? null;
}
