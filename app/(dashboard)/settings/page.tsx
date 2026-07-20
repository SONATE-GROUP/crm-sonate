import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiKeyManager } from "@/components/ApiKeyManager";
import { IntegrationSettingForm } from "@/components/IntegrationSettingForm";
import { PageHeader } from "@/components/PageHeader";
import { getIntegrationSettingForOwner, listApiKeysForOwner } from "@/lib/queries";
import { getCurrentUserEmail } from "@/lib/session";

export default async function SettingsPage() {
  const email = await getCurrentUserEmail();
  if (!email) redirect("/login");

  const [keys, derrickSetting] = await Promise.all([
    listApiKeysForOwner(email),
    getIntegrationSettingForOwner(email, "derrick_app"),
  ]);

  const hdrs = await headers();
  const host = hdrs.get("host");
  const isLocal = host?.startsWith("localhost") || host?.startsWith("127.");
  const webhookUrl = host ? `${isLocal ? "http" : "https"}://${host}/api/leads` : "/api/leads";

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
    </div>
  );
}
