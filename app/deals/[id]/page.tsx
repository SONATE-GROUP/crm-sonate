import Link from "next/link";
import { notFound } from "next/navigation";

import { getDealDetail } from "@/lib/queries";
import { Field, Section } from "@/components/DetailSection";
import { StatusBadge } from "@/components/StatusBadge";

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function formatMontant(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dealId = Number(id);
  if (!Number.isInteger(dealId)) notFound();

  const detail = await getDealDetail(dealId);
  if (!detail) notFound();

  const { deal, company, contacts, otherDeals } = detail;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/deals" className="text-sm font-medium text-sonate-muted hover:text-sonate-orange">
        ← Retour à la liste
      </Link>

      <h1 className="mt-2 mb-6 text-2xl font-extrabold tracking-tight">{company?.name}</h1>

      <Section title="Entreprise">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Nom" value={company?.name} />
          <Field
            label="Site web"
            value={
              company?.website ? (
                <a href={company.website} target="_blank" rel="noreferrer" className="text-sonate-orange hover:underline">
                  {company.website}
                </a>
              ) : null
            }
          />
          <Field label="Secteur" value={company?.sector} />
          <Field label="B2B / B2C" value={company?.b2bB2c} />
          <Field
            label="LinkedIn"
            value={
              company?.linkedinUrl ? (
                <a href={company.linkedinUrl} target="_blank" rel="noreferrer" className="text-sonate-orange hover:underline">
                  {company.linkedinUrl}
                </a>
              ) : null
            }
          />
          <Field label="Source système" value={company?.sourceSystem} />
          <Field label="Créée le" value={formatDate(company?.createdAt ?? null)} />
        </dl>
      </Section>

      <Section title={`Contact${contacts.length > 1 ? "s" : ""}`}>
        <div className="space-y-3">
          {contacts.map((c) => (
            <dl
              key={c.id}
              className="grid grid-cols-2 gap-4 border-b border-sonate-green/5 pb-3 last:border-0 last:pb-0 sm:grid-cols-4"
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

      <Section title="Deal">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Statut" value={deal.status ? <StatusBadge status={deal.status} /> : null} />
          <Field label="Qualification" value={deal.qualification} />
          <Field label="Score" value={<span className="font-bold text-sonate-orange">{deal.score}</span>} />
          <Field label="Owner" value={deal.owner} />
          <Field label="Source" value={deal.source} />
          <Field label="Montant devis" value={formatMontant(deal.montantDevis)} />
          <Field label="Panier moyen" value={deal.panierMoyen} />
          <Field label="CA mensuel" value={deal.caMensuel} />
          <Field label="Dépense marketing mensuelle" value={deal.depenseMarketingMensuelle} />
          <Field label="Créé le" value={formatDate(deal.createdAt)} />
          <Field label="Mis à jour le" value={formatDate(deal.updatedAt)} />
        </dl>
        <dl className="mt-4 grid grid-cols-1 gap-4">
          <Field label="Besoin principal" value={deal.besoinPrincipal} />
          <Field label="KPI cible" value={deal.kpiCible} />
          <Field label="Raison de refus" value={deal.raisonDeRefus} />
          <Field label="Message" value={deal.message} />
        </dl>
      </Section>

      {otherDeals.length > 0 && (
        <Section title="Autres deals de cette entreprise">
          <ul className="space-y-2 text-sm">
            {otherDeals.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <Link href={`/deals/${d.id}`} className="font-medium text-sonate-green hover:text-sonate-orange">
                  Deal #{d.id}
                </Link>
                <div className="flex items-center gap-3">
                  {d.status ? <StatusBadge status={d.status} /> : <span className="text-sonate-muted">sans statut</span>}
                  <span className="text-sonate-muted">{formatDate(d.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
