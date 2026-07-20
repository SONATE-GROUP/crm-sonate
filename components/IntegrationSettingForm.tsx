"use client";

import { useState, useTransition } from "react";

import type { IntegrationProvider } from "@/db/schema";
import { deleteIntegrationSetting, saveIntegrationSetting } from "@/lib/settings-actions";
import { fieldClass, labelClass } from "@/lib/ui";

export function IntegrationSettingForm({
  provider,
  configured,
  updatedAt,
}: {
  provider: IntegrationProvider;
  configured: boolean;
  updatedAt: Date | null;
}) {
  const [value, setValue] = useState("");
  const [isConfigured, setIsConfigured] = useState(configured);
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    startTransition(async () => {
      await saveIntegrationSetting(provider, value);
      setIsConfigured(true);
      setSavedAt(new Date());
      setValue("");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteIntegrationSetting(provider);
      setIsConfigured(false);
      setSavedAt(null);
    });
  }

  return (
    <form onSubmit={handleSave} className="flex items-end gap-2">
      <div className="flex-1">
        <label className={labelClass}>Clé API</label>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isConfigured ? "Configurée, laisser vide pour ne pas changer" : "Coller la clé ici"}
          className={fieldClass}
        />
        {isConfigured && (
          <p className="mt-1 text-xs text-sonate-muted">
            Configurée{savedAt ? ` le ${new Date(savedAt).toLocaleDateString("fr-FR")}` : ""}.
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending || !value.trim()}
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
    </form>
  );
}
