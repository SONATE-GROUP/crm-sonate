"use client";

import { useState, useTransition } from "react";

import { deleteIntegrationSetting, saveIntegrationSetting } from "@/lib/settings-actions";
import { fieldClass, labelClass } from "@/lib/ui";

export function GoogleOAuthSettingForm({ configured, redirectUri }: { configured: boolean; redirectUri: string }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConfigured, setIsConfigured] = useState(configured);
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) return;
    startTransition(async () => {
      await saveIntegrationSetting("google_oauth", JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }));
      setIsConfigured(true);
      setClientId("");
      setClientSecret("");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteIntegrationSetting("google_oauth");
      setIsConfigured(false);
    });
  }

  return (
    <div>
      <p className="mb-2 text-sm text-sonate-muted">
        URI de redirection à déclarer dans Google Cloud Console (Identifiants OAuth 2.0) :
      </p>
      <code className="mb-4 block break-all rounded-lg bg-sonate-green/5 px-3 py-2 text-sm text-sonate-green">
        {redirectUri}
      </code>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Client ID</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={isConfigured ? "Configuré, laisser vide pour ne pas changer" : "xxxxx.apps.googleusercontent.com"}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Client Secret</label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={isConfigured ? "Configuré, laisser vide pour ne pas changer" : "Coller le secret ici"}
            className={fieldClass}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={isPending || !clientId.trim() || !clientSecret.trim()}
            className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark disabled:opacity-50"
          >
            Enregistrer
          </button>
          {isConfigured && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-full border border-sonate-green/20 px-5 py-2 text-sm font-semibold text-sonate-green"
            >
              Supprimer
            </button>
          )}
        </div>
      </form>
      {isConfigured && <p className="mt-2 text-xs text-sonate-muted">Configuré.</p>}
    </div>
  );
}
