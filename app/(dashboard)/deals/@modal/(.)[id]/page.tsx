import Link from "next/link";
import { notFound } from "next/navigation";

import { getDealDetail } from "@/lib/queries";
import { requireActiveWorkspace } from "@/lib/session";
import { Drawer } from "@/components/Drawer";
import { DrawerSection, DrawerRow } from "@/components/DrawerSection";
import { DealStatusSelect } from "@/components/DealStatusSelect";

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function formatMontant(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

export default async function DealModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dealId = Number(id);
  if (!Number.isInteger(dealId)) notFound();

  const { workspaceId } = await requireActiveWorkspace(`/deals/${id}`);
  const detail = await getDealDetail(dealId, { workspaceId });
  if (!detail) notFound();

  const { deal, company, contacts, otherDeals } = detail;

  return (
    <Drawer title={company?.name ?? `Deal #${deal.id}`} subtitle={`Deal #${deal.id}`}>
      <DrawerSection title="Statut">
        <DealStatusSelect dealId={deal.id} status={deal.status} />
      </DrawerSection>

      <DrawerSection title="Deal">
        <DrawerRow label="Qualification" value={deal.qualification} />
        <DrawerRow label="Score" value={deal.score !== null ? <span className="font-bold text-sonate-orange">{deal.score}</span> : null} />
        <DrawerRow label="Owner" value={deal.owner} />
        <DrawerRow label="Source" value={deal.source} />
        <DrawerRow label="Montant devis" value={formatMontant(deal.montantDevis)} />
        <DrawerRow label="Panier moyen" value={deal.panierMoyen} />
        <DrawerRow label="CA mensuel" value={deal.caMensuel} />
        <DrawerRow label="Créé le" value={formatDate(deal.createdAt)} />
        <DrawerRow label="Mis à jour le" value={formatDate(deal.updatedAt)} />
      </DrawerSection>

      {(deal.besoinPrincipal || deal.kpiCible || deal.raisonDeRefus || deal.message) && (
        <DrawerSection title="Détails">
          <DrawerRow label="Besoin principal" value={deal.besoinPrincipal} />
          <DrawerRow label="KPI cible" value={deal.kpiCible} />
          <DrawerRow label="Raison de refus" value={deal.raisonDeRefus} />
          <DrawerRow label="Message" value={deal.message} />
        </DrawerSection>
      )}

      <DrawerSection title="Entreprise">
        <DrawerRow
          label="Nom"
          value={
            company ? (
              <Link href={`/companies/${company.id}`} className="text-sonate-orange hover:underline">
                {company.name}
              </Link>
            ) : null
          }
        />
        <DrawerRow label="Secteur" value={company?.sector} />
        <DrawerRow label="B2B / B2C" value={company?.b2bB2c} />
      </DrawerSection>

      <DrawerSection title={`Contact${contacts.length > 1 ? "s" : ""}`}>
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

      {otherDeals.length > 0 && (
        <DrawerSection title="Autres deals de cette entreprise">
          {otherDeals.map((d) => (
            <DrawerRow
              key={d.id}
              label={`Deal #${d.id}`}
              value={
                <Link href={`/deals/${d.id}`} className="text-sonate-orange hover:underline">
                  {d.status ?? "sans statut"}
                </Link>
              }
            />
          ))}
        </DrawerSection>
      )}

      <Link
        href={`/deals/${deal.id}`}
        className="inline-block rounded-full border border-sonate-green/20 px-4 py-1.5 text-sm font-semibold text-sonate-green"
      >
        Ouvrir en page complète →
      </Link>
    </Drawer>
  );
}
