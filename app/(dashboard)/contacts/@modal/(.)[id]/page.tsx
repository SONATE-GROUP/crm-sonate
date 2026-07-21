import Link from "next/link";
import { notFound } from "next/navigation";

import { getContactDetail, getConversationsForContact } from "@/lib/queries";
import { requireActiveWorkspace } from "@/lib/session";
import { Drawer } from "@/components/Drawer";
import { DrawerSection, DrawerRow } from "@/components/DrawerSection";
import { StatusBadge } from "@/components/StatusBadge";
import { EnrichmentPanel } from "@/components/EnrichmentPanel";
import { ConversationThread } from "@/components/ConversationThread";
import { TemperatureBadge } from "@/components/TemperatureBadge";
import { getLatestRunsForEntity } from "@/lib/enrichment-runs";

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

export default async function ContactModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contactId = Number(id);
  if (!Number.isInteger(contactId)) notFound();

  const { workspaceId } = await requireActiveWorkspace(`/contacts/${id}`);
  const detail = await getContactDetail(contactId, { workspaceId });
  if (!detail) notFound();

  const { contact, company, deals } = detail;
  const [enrichmentRuns, conversations] = await Promise.all([
    getLatestRunsForEntity("contact", contact.id),
    getConversationsForContact(contact.id),
  ]);

  return (
    <Drawer
      title={contact.fullName}
      subtitle={[contact.role, company?.name].filter(Boolean).join(" · ") || undefined}
    >
      <DrawerSection title="Contact">
        {contact.aiTemperature && (
          <DrawerRow
            label="Température"
            value={<TemperatureBadge temperature={contact.aiTemperature} reason={contact.aiTemperatureReason} />}
          />
        )}
        <DrawerRow label="Email" value={contact.email} />
        <DrawerRow label="Téléphone" value={contact.phone} />
        <DrawerRow label="Rôle" value={contact.role} />
        <DrawerRow
          label="LinkedIn"
          value={
            contact.linkedinUrl ? (
              <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="text-sonate-orange hover:underline">
                Profil
              </a>
            ) : null
          }
        />
        <DrawerRow label="Créé le" value={formatDate(contact.createdAt)} />
      </DrawerSection>

      <DrawerSection title={`Conversations (${conversations.length})`}>
        <ConversationThread messages={conversations} />
      </DrawerSection>

      <DrawerSection title="Enrichissement (Derrick App)">
        <EnrichmentPanel
          entityType="contact"
          entityId={contact.id}
          runs={enrichmentRuns}
          disabledReasons={{
            ...(contact.linkedinUrl ? {} : { phone: "Trouve d'abord le profil LinkedIn du contact." }),
            ...(contact.email ? {} : { verify_email: "Ce contact n'a pas d'email." }),
          }}
        />
      </DrawerSection>

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
        <DrawerRow
          label="Site web"
          value={
            company?.website ? (
              <a href={company.website} target="_blank" rel="noreferrer" className="text-sonate-orange hover:underline">
                {company.website}
              </a>
            ) : null
          }
        />
        <DrawerRow label="Secteur" value={company?.sector} />
        <DrawerRow label="B2B / B2C" value={company?.b2bB2c} />
        <DrawerRow label="Source système" value={company?.sourceSystem} />
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
        href={`/contacts/${contact.id}`}
        className="inline-block rounded-full border border-sonate-green/20 px-4 py-1.5 text-sm font-semibold text-sonate-green"
      >
        Ouvrir en page complète →
      </Link>
    </Drawer>
  );
}
