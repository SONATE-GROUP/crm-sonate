import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompanyDetail } from "@/lib/queries";
import { requireActiveWorkspace } from "@/lib/session";
import { Field, Section } from "@/components/DetailSection";
import { StatusBadge } from "@/components/StatusBadge";
import { EnrichmentPanel } from "@/components/EnrichmentPanel";
import { mergePendingLead, dismissPendingLead } from "@/lib/actions";
import { DEAL_STATUS_LABELS } from "@/db/schema";
import { getLatestRunsForEntity } from "@/lib/enrichment-runs";

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString("fr-FR");
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) notFound();

  const { workspaceId } = await requireActiveWorkspace(`/companies/${id}`);
  const detail = await getCompanyDetail(companyId, { workspaceId });
  if (!detail) notFound();

  const { company, contacts, deals, pendingLeads } = detail;
  const enrichmentRuns = await getLatestRunsForEntity("company", company.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/companies" className="text-sm font-medium text-sonate-muted hover:text-sonate-orange">
        ← Retour à la liste des entreprises
      </Link>

      <h1 className="mt-2 mb-6 text-2xl font-extrabold tracking-tight">{company.name}</h1>

      {pendingLeads.length > 0 && (
        <section className="mb-6 rounded-2xl border border-sonate-orange/30 bg-sonate-orange/5 p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-sonate-orange">
            ⚠ Leads en attente de fusion ({pendingLeads.length})
          </h2>
          <div className="space-y-4">
            {pendingLeads.map((pending) => (
              <div key={pending.id} className="rounded-xl border border-sonate-orange/20 bg-white p-4">
                <p className="mb-2 text-xs text-sonate-muted">Reçu le {formatDateTime(pending.createdAt)}</p>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  {pending.payload.company.name !== company.name && (
                    <Field label="Nom entreprise reçu" value={pending.payload.company.name} />
                  )}
                  <Field label="Contact" value={pending.payload.contact?.fullName} />
                  <Field label="Email" value={pending.payload.contact?.email} />
                  <Field label="Téléphone" value={pending.payload.contact?.phone} />
                  <Field
                    label="Statut deal"
                    value={pending.payload.deal?.status ? DEAL_STATUS_LABELS[pending.payload.deal.status] : null}
                  />
                  <Field label="Score" value={pending.payload.deal?.score} />
                  <Field label="Source" value={pending.payload.deal?.source} />
                </dl>
                <div className="mt-3 flex gap-2">
                  <form action={mergePendingLead.bind(null, pending.id)}>
                    <button
                      type="submit"
                      className="rounded-full bg-sonate-orange px-4 py-1.5 text-sm font-semibold text-sonate-cream hover:bg-sonate-orange-dark"
                    >
                      Fusionner (nouveau deal)
                    </button>
                  </form>
                  <form action={dismissPendingLead.bind(null, pending.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-sonate-green/20 px-4 py-1.5 text-sm font-semibold text-sonate-green"
                    >
                      Ignorer
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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

      <Section title="Enrichissement (Derrick App)">
        <EnrichmentPanel
          entityType="company"
          entityId={company.id}
          runs={enrichmentRuns}
          disabledReasons={company.website ? {} : { website_contact_social: "Pas de site web renseigné." }}
        />
      </Section>

      <Section title={`Contact${contacts.length > 1 ? "s" : ""} (${contacts.length})`}>
        <div className="space-y-3">
          {contacts.map((c) => (
            <dl
              key={c.id}
              className="grid grid-cols-2 gap-4 border-b border-sonate-green/5 pb-3 last:border-0 last:pb-0 sm:grid-cols-4"
            >
              <Field
                label="Nom"
                value={
                  <Link href={`/contacts/${c.id}`} className="text-sonate-orange hover:underline">
                    {c.fullName}
                  </Link>
                }
              />
              <Field label="Email" value={c.email} />
              <Field label="Téléphone" value={c.phone} />
              <Field label="Rôle" value={c.role} />
            </dl>
          ))}
          {contacts.length === 0 && <p className="text-sm text-sonate-muted">Aucun contact.</p>}
        </div>
      </Section>

      <Section title={`Deals (${deals.length})`}>
        <ul className="space-y-2 text-sm">
          {deals.map((d) => (
            <li key={d.id} className="flex items-center justify-between border-b border-sonate-green/5 py-2 last:border-0">
              <Link href={`/deals/${d.id}`} className="font-medium text-sonate-green hover:text-sonate-orange">
                Deal #{d.id}
              </Link>
              <div className="flex items-center gap-3">
                {d.status ? <StatusBadge status={d.status} /> : <span className="text-sonate-muted">sans statut</span>}
                <span className="text-sonate-muted">{formatDate(d.createdAt)}</span>
              </div>
            </li>
          ))}
          {deals.length === 0 && <p className="text-sm text-sonate-muted">Aucun deal.</p>}
        </ul>
      </Section>
    </div>
  );
}
