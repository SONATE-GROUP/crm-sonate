import Link from "next/link";
import { notFound } from "next/navigation";

import { getContactDetail, getConversationsForContact } from "@/lib/queries";
import { Field, Section } from "@/components/DetailSection";
import { StatusBadge } from "@/components/StatusBadge";
import { EnrichmentPanel } from "@/components/EnrichmentPanel";
import { ConversationThread } from "@/components/ConversationThread";
import { TemperatureBadge } from "@/components/TemperatureBadge";
import { getLatestRunsForEntity } from "@/lib/enrichment-runs";

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contactId = Number(id);
  if (!Number.isInteger(contactId)) notFound();

  const detail = await getContactDetail(contactId);
  if (!detail) notFound();

  const { contact, company, deals } = detail;
  const [enrichmentRuns, conversations] = await Promise.all([
    getLatestRunsForEntity("contact", contact.id),
    getConversationsForContact(contact.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/contacts" className="text-sm font-medium text-sonate-muted hover:text-sonate-orange">
        ← Retour à la liste des contacts
      </Link>

      <h1 className="mt-2 mb-6 flex items-center gap-3 text-2xl font-extrabold tracking-tight">
        {contact.fullName}
        <TemperatureBadge temperature={contact.aiTemperature} reason={contact.aiTemperatureReason} />
      </h1>

      <Section title="Contact">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Nom" value={contact.fullName} />
          <Field label="Email" value={contact.email} />
          <Field label="Téléphone" value={contact.phone} />
          <Field label="Rôle" value={contact.role} />
          <Field
            label="LinkedIn"
            value={
              contact.linkedinUrl ? (
                <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="text-sonate-orange hover:underline">
                  {contact.linkedinUrl}
                </a>
              ) : null
            }
          />
          <Field label="Créé le" value={formatDate(contact.createdAt)} />
        </dl>
      </Section>

      <Section title={`Conversations (${conversations.length})`}>
        <ConversationThread messages={conversations} />
      </Section>

      <Section title="Enrichissement (Derrick App)">
        <EnrichmentPanel
          entityType="contact"
          entityId={contact.id}
          runs={enrichmentRuns}
          disabledReasons={{
            ...(contact.linkedinUrl ? {} : { phone: "Trouve d'abord le profil LinkedIn du contact." }),
            ...(contact.email ? {} : { verify_email: "Ce contact n'a pas d'email." }),
          }}
        />
      </Section>

      <Section title="Entreprise">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label="Nom"
            value={
              company ? (
                <Link href={`/companies/${company.id}`} className="text-sonate-orange hover:underline">
                  {company.name}
                </Link>
              ) : null
            }
          />
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
          <Field label="Source système" value={company?.sourceSystem} />
        </dl>
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
