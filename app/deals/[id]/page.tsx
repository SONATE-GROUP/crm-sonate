import Link from "next/link";
import { notFound } from "next/navigation";

import { DEAL_STATUS_LABELS } from "@/db/schema";
import { getDealDetail } from "@/lib/queries";

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function formatMontant(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">{value ?? "—"}</dd>
    </div>
  );
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
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/deals" className="text-sm text-zinc-500 hover:underline">
        ← Retour à la liste
      </Link>

      <h1 className="mt-2 mb-6 text-xl font-semibold">{company?.name}</h1>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">Entreprise</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Nom" value={company?.name} />
          <Field
            label="Site web"
            value={
              company?.website ? (
                <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
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
                <a href={company.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                  {company.linkedinUrl}
                </a>
              ) : null
            }
          />
          <Field label="Source système" value={company?.sourceSystem} />
          <Field label="Créée le" value={formatDate(company?.createdAt ?? null)} />
        </dl>
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">
          Contact{contacts.length > 1 ? "s" : ""}
        </h2>
        <div className="space-y-3">
          {contacts.map((c) => (
            <dl key={c.id} className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0 sm:grid-cols-4 dark:border-zinc-800">
              <Field label="Nom" value={c.fullName} />
              <Field label="Email" value={c.email} />
              <Field label="Téléphone" value={c.phone} />
              <Field label="Rôle" value={c.role} />
            </dl>
          ))}
          {contacts.length === 0 && <p className="text-sm text-zinc-500">Aucun contact.</p>}
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">Deal</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Statut" value={deal.status ? DEAL_STATUS_LABELS[deal.status] : null} />
          <Field label="Qualification" value={deal.qualification} />
          <Field label="Score" value={deal.score} />
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
      </section>

      {otherDeals.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">Autres deals de cette entreprise</h2>
          <ul className="space-y-1 text-sm">
            {otherDeals.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  Deal #{d.id} — {d.status ? DEAL_STATUS_LABELS[d.status] : "sans statut"} ({formatDate(d.createdAt)})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
