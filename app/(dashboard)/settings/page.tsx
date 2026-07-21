import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiKeyManager } from "@/components/ApiKeyManager";
import { IntegrationSettingForm } from "@/components/IntegrationSettingForm";
import { PageHeader } from "@/components/PageHeader";
import { getIntegrationSettingForOwner, listApiKeysForOwner } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const email = user.email;

  const [keys, derrickSetting, lgmSetting, anthropicSetting] = await Promise.all([
    listApiKeysForOwner(email),
    getIntegrationSettingForOwner(email, "derrick_app"),
    getIntegrationSettingForOwner(email, "lagrowthmachine"),
    getIntegrationSettingForOwner(email, "anthropic"),
  ]);

  const hdrs = await headers();
  const host = hdrs.get("host");
  const isLocal = host?.startsWith("localhost") || host?.startsWith("127.");
  const origin = host ? `${isLocal ? "http" : "https"}://${host}` : "";
  const webhookUrl = origin ? `${origin}/api/leads` : "/api/leads";
  const lgmWebhookUrl = origin ? `${origin}/api/lgm/webhook` : "/api/lgm/webhook";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="Paramètres" />
      <p className="mb-8 text-sm text-sonate-muted">
        Connecté en tant que <span className="font-semibold text-sonate-green">{email}</span>. Ces réglages sont
        propres à ton compte : chacun configure ses propres clés, rien n&apos;est partagé via les variables
        d&apos;environnement Netlify.
      </p>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-bold text-sonate-green">Webhook d&apos;ingestion (Make / n8n)</h2>
        <p className="mb-4 text-sm text-sonate-muted">
          Configure un module HTTP dans Make (ou un nœud HTTP Request dans n8n) qui envoie un <code>POST</code> vers
          l&apos;URL ci-dessous, avec le header <code>x-api-key</code> réglé sur une des clés générées ci-dessous.
        </p>
        <code className="mb-5 block break-all rounded-lg bg-sonate-green/5 px-3 py-2 text-sm text-sonate-green">
          POST {webhookUrl}
        </code>
        <ApiKeyManager initialKeys={keys} />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold text-sonate-green">Intégrations</h2>
        <p className="mb-4 text-sm text-sonate-muted">
          Derrick App (enrichissement automatique des nouvelles entreprises créées via le webhook). Renseigne ici la
          clé API récupérée dans l&apos;add-on Google Sheets Derrick (menu burger → API).
        </p>
        <IntegrationSettingForm
          provider="derrick_app"
          configured={derrickSetting !== null}
          updatedAt={derrickSetting?.updatedAt ?? null}
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-bold text-sonate-green">LaGrowthMachine</h2>
        <p className="mb-4 text-sm text-sonate-muted">
          Clé API LaGrowthMachine (Réglages → API dans LGM), utilisée pour les futurs appels de synchro (import
          d&apos;historique de conversations).
        </p>
        <IntegrationSettingForm
          provider="lagrowthmachine"
          configured={lgmSetting !== null}
          updatedAt={lgmSetting?.updatedAt ?? null}
        />
        <p className="mt-5 mb-1 text-sm font-semibold text-sonate-green">Webhook inbox (messages en temps réel)</p>
        <p className="mb-2 text-sm text-sonate-muted">
          Dans LGM, crée un &quot;Inbox Event Webhook&quot; (via l&apos;API <code>POST /flow/inboxWebhooks</code>,
          type <code>INBOX_MESSAGE</code>) pointant vers l&apos;URL ci-dessous, avec <code>?key=</code> suivi d&apos;une
          des clés API générées plus haut sur cette page.
        </p>
        <code className="block break-all rounded-lg bg-sonate-green/5 px-3 py-2 text-sm text-sonate-green">
          {lgmWebhookUrl}?key=VOTRE_CLE_API
        </code>
      </section>

      {user.isAdmin && (
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-bold text-sonate-green">Administration</h2>
          <p className="mb-4 text-sm text-sonate-muted">
            Gestion des comptes et des espaces clients (visible uniquement par les admins).
          </p>
          <div className="flex gap-3">
            <Link
              href="/settings/users"
              className="rounded-full border border-sonate-green/20 px-5 py-2 text-sm font-semibold text-sonate-green hover:bg-sonate-green/5"
            >
              Utilisateurs →
            </Link>
            <Link
              href="/settings/workspaces"
              className="rounded-full border border-sonate-green/20 px-5 py-2 text-sm font-semibold text-sonate-green hover:bg-sonate-green/5"
            >
              Espaces clients →
            </Link>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-bold text-sonate-green">Anthropic (Claude)</h2>
        <p className="mb-4 text-sm text-sonate-muted">
          Clé API Anthropic (console.anthropic.com → API Keys), utilisée pour l&apos;analyse de température des
          conversations. Sans cette clé, l&apos;analyse est simplement ignorée.
        </p>
        <IntegrationSettingForm
          provider="anthropic"
          configured={anthropicSetting !== null}
          updatedAt={anthropicSetting?.updatedAt ?? null}
        />
      </section>
    </div>
  );
}
