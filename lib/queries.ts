import { and, asc, desc, eq, gte, like, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { companies, contacts, deals, type DealStatus, type B2bB2c } from "@/db/schema";

export const PAGE_SIZE = 50;

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

function buildWhere(filters: DealListFilters) {
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

export async function listDeals(filters: DealListFilters) {
  const cpc = contactPerCompanyCte();
  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);

  const rows = await db
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
    .offset((page - 1) * PAGE_SIZE);

  const [{ count }] = await db
    .with(cpc)
    .select({ count: sql<number>`count(*)` })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(cpc, eq(cpc.companyId, companies.id))
    .leftJoin(contacts, eq(contacts.id, cpc.contactId))
    .where(where);

  return { rows, total: count, page, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export async function listOwners() {
  const rows = await db
    .select({ owner: deals.owner })
    .from(deals)
    .where(sql`${deals.owner} is not null`)
    .groupBy(deals.owner)
    .orderBy(asc(deals.owner));
  return rows.map((r) => r.owner!).filter(Boolean);
}

export async function getDealDetail(id: number) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) return null;

  const [company] = await db.select().from(companies).where(eq(companies.id, deal.companyId)).limit(1);
  const companyContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.companyId, deal.companyId))
    .orderBy(asc(contacts.id));
  const companyDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.companyId, deal.companyId))
    .orderBy(desc(deals.createdAt));

  return { deal, company, contacts: companyContacts, otherDeals: companyDeals.filter((d) => d.id !== id) };
}
