import Link from "next/link";
import { notFound } from "next/navigation";

import { DEAL_STATUS_LABELS } from "@/db/schema";
import { getCompanyDetail } from "@/lib/queries";
import { Field, Section } from "@/components/DetailSection";

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) notFound();

  const detail = await getCompanyDetail(companyId);
  if (!detail) notFound();

  const { company, contacts, deals } = detail;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/companies" className="text-sm font-medium text-sonate-muted hover:text-sonate-orange">
        ← Retour à la liste des entreprises
      </Link>

      <h1 className="mt-2 mb-6 text-2xl font-extrabold tracking-tight">{company.name}</h1>

      <Section title="Entreprise">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Nom" value={company.name} />
          <Field
            label="Site web"
            value={
              company.website ? (
                <a href={company.website} target="_blank" rel="noreferrer" className="text-sonate-orange hover:underline">
                  {company.website}
                </a>
              ) : null
            }
          />
          <Field label="Secteur" value={company.sector} />
          <Field label="B2B / B2C" value={company.b2bB2c} />
          <Field
            label="LinkedIn"
            value={
              company.linkedinUrl ? (
                <a href={company.linkedinUrl} target="_blank" rel="noreferrer" className="text-sonate-orange hover:underline">
                  {company.linkedinUrl}
                </a>
              ) : null
            }
          />
          <Field label="Source système" value={company.sourceSystem} />
          <Field label="Créée le" value={formatDate(company.createdAt)} />
        </dl>
      </Section>

      <Section title={`Contact${contacts.length > 1 ? "s" : ""} (${contacts.length})`}>
        <div className="space-y-3">
          {contacts.map((c) => (
            <dl
              key={c.id}
              className="grid grid-cols-2 gap-4 border-b border-sonate-green/5 pb-3 last:border-0 last:pb-0 sm:grid-cols-4 dark:border-sonate-cream/5"
            >
              <Field label="Nom" value={c.fullName} />
              <Field label="Email" value={c.email} />
              <Field label="Téléphone" value={c.phone} />
              <Field label="Rôle" value={c.role} />
            </dl>
          ))}
          {contacts.length === 0 && <p className="text-sm text-sonate-muted">Aucun contact.</p>}
        </div>
      </Section>

      <Section title={`Deals (${deals.length})`}>
        <ul className="space-y-1 text-sm">
          {deals.map((d) => (
            <li key={d.id} className="flex items-center justify-between border-b border-sonate-green/5 py-2 last:border-0 dark:border-sonate-cream/5">
              <Link href={`/deals/${d.id}`} className="font-medium text-sonate-orange hover:underline">
                Deal #{d.id} — {d.status ? DEAL_STATUS_LABELS[d.status] : "sans statut"}
              </Link>
              <span className="text-sonate-muted">{formatDate(d.createdAt)}</span>
            </li>
          ))}
          {deals.length === 0 && <p className="text-sm text-sonate-muted">Aucun deal.</p>}
        </ul>
      </Section>
    </div>
  );
}
