import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompanyDetail } from "@/lib/queries";
import { Drawer } from "@/components/Drawer";
import { DrawerSection, DrawerRow } from "@/components/DrawerSection";
import { StatusBadge } from "@/components/StatusBadge";
import { mergePendingLead, dismissPendingLead } from "@/lib/actions";
import { DEAL_STATUS_LABELS } from "@/db/schema";

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString("fr-FR");
}

export default async function CompanyModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) notFound();

  const detail = await getCompanyDetail(companyId);
  if (!detail) notFound();

  const { company, contacts, deals, pendingLeads } = detail;

  return (
    <Drawer title={company.name} subtitle={company.sector ?? undefined}>
      {pendingLeads.length > 0 && (
        <section className="mb-6 rounded-xl border border-sonate-orange/30 bg-sonate-orange/5 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-sonate-orange">
            ⚠ Leads en attente de fusion ({pendingLeads.length})
          </h3>
          <div className="space-y-3">
            {pendingLeads.map((pending) => (
              <div key={pending.id} className="rounded-lg border border-sonate-orange/20 bg-white p-3">
                <p className="mb-2 text-xs text-sonate-muted">Reçu le {formatDateTime(pending.createdAt)}</p>
                {pending.payload.company.name !== company.name && (
                  <DrawerRow label="Nom entreprise reçu" value={pending.payload.company.name} />
                )}
                <DrawerRow label="Contact" value={pending.payload.contact?.fullName} />
                <DrawerRow label="Email" value={pending.payload.contact?.email} />
                <DrawerRow label="Téléphone" value={pending.payload.contact?.phone} />
                <DrawerRow
                  label="Statut deal"
                  value={pending.payload.deal?.status ? DEAL_STATUS_LABELS[pending.payload.deal.status] : null}
                />
                <DrawerRow label="Score" value={pending.payload.deal?.score} />
                <DrawerRow label="Source" value={pending.payload.deal?.source} />
                <div className="mt-3 flex gap-2">
                  <form action={mergePendingLead.bind(null, pending.id)}>
                    <button
                      type="submit"
                      className="rounded-full bg-sonate-orange px-3 py-1.5 text-xs font-semibold text-sonate-cream hover:bg-sonate-orange-dark"
                    >
                      Fusionner (nouveau deal)
                    </button>
                  </form>
                  <form action={dismissPendingLead.bind(null, pending.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-sonate-green/20 px-3 py-1.5 text-xs font-semibold text-sonate-green"
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

      <DrawerSection title="Entreprise">
        <DrawerRow label="Nom" value={company.name} />
        <DrawerRow
          label="Site web"
          value={
            company.website ? (
              <a href={company.website} target="_blank" rel="noreferrer" className="text-sonate-orange hover:underline">
                {company.website}
              </a>
            ) : null
          }
        />
        <DrawerRow label="Secteur" value={company.sector} />
        <DrawerRow label="B2B / B2C" value={company.b2bB2c} />
        <DrawerRow
          label="LinkedIn"
          value={
            company.linkedinUrl ? (
              <a href={company.linkedinUrl} target="_blank" rel="noreferrer" className="text-sonate-orange hover:underline">
                {company.linkedinUrl}
              </a>
            ) : null
          }
        />
        <DrawerRow label="Source système" value={company.sourceSystem} />
        <DrawerRow label="Créée le" value={formatDate(company.createdAt)} />
      </DrawerSection>

      <DrawerSection title={`Contact${contacts.length > 1 ? "s" : ""} (${contacts.length})`}>
        {contacts.map((c) => (
          <DrawerRow
            key={c.id}
            label={c.fullName}
            value={
              <Link href={`/contacts/${c.id}`} className="text-sonate-orange hover:underline">
                {c.email ?? c.phone ?? "voir"}
              </Link>
            }
          />
        ))}
        {contacts.length === 0 && <p className="text-sm text-sonate-muted">Aucun contact.</p>}
      </DrawerSection>

      <DrawerSection title={`Deals (${deals.length})`}>
        {deals.map((d) => (
          <div key={d.id} className="flex items-center justify-between border-b border-sonate-green/5 py-2.5 last:border-0">
            <Link href={`/deals/${d.id}`} className="text-sm font-medium text-sonate-green hover:text-sonate-orange">
              Deal #{d.id}
            </Link>
            {d.status ? <StatusBadge status={d.status} /> : <span className="text-xs text-sonate-muted">sans statut</span>}
          </div>
        ))}
        {deals.length === 0 && <p className="text-sm text-sonate-muted">Aucun deal.</p>}
      </DrawerSection>

      <Link
        href={`/companies/${company.id}`}
        className="inline-block rounded-full border border-sonate-green/20 px-4 py-1.5 text-sm font-semibold text-sonate-green"
      >
        Ouvrir en page complète →
      </Link>
    </Drawer>
  );
}
