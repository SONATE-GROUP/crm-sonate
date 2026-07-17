import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gte, like, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { companies, contacts, deals, type DealStatus, type B2bB2c, type SourceSystem } from "@/db/schema";

export const PAGE_SIZE = 50;

// Les données ne changent que via une ré-exécution manuelle du script d'import
// (pas d'écriture depuis l'app, lecture seule) : un court cache limite les
// allers-retours réseau vers Turso sans risquer une fraîcheur perçue dégradée.
const REVALIDATE_SECONDS = 30;

export type DealListFilters = {
  q?: string;
  status?: DealStatus;
  b2bB2c?: B2bB2c;
  owner?: string;
  scoreMin?: number;
  page?: number;
};

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
export const listDeals = unstable_cache(_listDeals, ["list-deals"], { revalidate: REVALIDATE_SECONDS });

async function _listOwners() {
  const rows = await db
    .select({ owner: deals.owner })
    .from(deals)
    .where(sql`${deals.owner} is not null`)
    .groupBy(deals.owner)
    .orderBy(asc(deals.owner));
  return rows.map((r) => r.owner!).filter(Boolean);
}
export const listOwners = unstable_cache(_listOwners, ["list-owners"], { revalidate: REVALIDATE_SECONDS });

export type CompanyListFilters = {
  q?: string;
  b2bB2c?: B2bB2c;
  sourceSystem?: SourceSystem;
  page?: number;
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

  const [rows, countRows] = await Promise.all([
    db
      .with(dealCount, contactCount)
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
      })
      .from(companies)
      .leftJoin(dealCount, eq(dealCount.companyId, companies.id))
      .leftJoin(contactCount, eq(contactCount.companyId, companies.id))
      .where(where)
      .orderBy(desc(companies.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)` }).from(companies).where(where),
  ]);

  const count = countRows[0].count;
  return { rows, total: count, page, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}
export const listCompanies = unstable_cache(_listCompanies, ["list-companies"], { revalidate: REVALIDATE_SECONDS });

async function _getCompanyDetail(id: number) {
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) return null;

  const [companyContacts, companyDeals] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.companyId, id)).orderBy(asc(contacts.id)),
    db.select().from(deals).where(eq(deals.companyId, id)).orderBy(desc(deals.createdAt)),
  ]);

  return { company, contacts: companyContacts, deals: companyDeals };
}
export const getCompanyDetail = unstable_cache(_getCompanyDetail, ["get-company-detail"], {
  revalidate: REVALIDATE_SECONDS,
});

export type ContactListFilters = {
  q?: string;
  page?: number;
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
  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function _listContacts(filters: ContactListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildContactsWhere(filters);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        fullName: contacts.fullName,
        email: contacts.email,
        phone: contacts.phone,
        role: contacts.role,
        companyId: companies.id,
        companyName: companies.name,
      })
      .from(contacts)
      .innerJoin(companies, eq(contacts.companyId, companies.id))
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
export const listContacts = unstable_cache(_listContacts, ["list-contacts"], { revalidate: REVALIDATE_SECONDS });

async function _getDealDetail(id: number) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) return null;

  const [company, companyDeals, companyContacts] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, deal.companyId)).limit(1).then((r) => r[0]),
    db.select().from(deals).where(eq(deals.companyId, deal.companyId)).orderBy(desc(deals.createdAt)),
    db.select().from(contacts).where(eq(contacts.companyId, deal.companyId)).orderBy(asc(contacts.id)),
  ]);

  return { deal, company, contacts: companyContacts, otherDeals: companyDeals.filter((d) => d.id !== id) };
}
export const getDealDetail = unstable_cache(_getDealDetail, ["get-deal-detail"], { revalidate: REVALIDATE_SECONDS });
