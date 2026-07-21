"use client";

import { useState, useTransition } from "react";

import { createApiKey, revokeApiKey } from "@/lib/settings-actions";
import { fieldClass, labelClass } from "@/lib/ui";

type ApiKeyRow = {
  id: number;
  label: string;
  keyPreview: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  workspaceId: number | null;
  workspaceName: string | null;
};

type WorkspaceOption = { id: number; name: string };

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

export function ApiKeyManager({
  initialKeys,
  workspaces,
}: {
  initialKeys: ApiKeyRow[];
  workspaces: WorkspaceOption[];
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [label, setLabel] = useState("");
  const [workspaceId, setWorkspaceId] = useState(String(workspaces[0]?.id ?? ""));
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!workspaceId) {
      setError("Choisis l'espace dans lequel cette clé fera atterrir ses leads.");
      return;
    }
    startTransition(async () => {
      const result = await createApiKey(label, Number(workspaceId));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const targetWorkspace = workspaces.find((w) => w.id === result.workspaceId);
      setKeys((prev) => [
        {
          id: result.id,
          label: result.label,
          keyPreview: result.keyPreview,
          createdAt: result.createdAt,
          lastUsedAt: null,
          workspaceId: result.workspaceId,
          workspaceName: targetWorkspace?.name ?? null,
        },
        ...prev,
      ]);
      setNewPlaintext(result.plaintext);
      setLabel("");
    });
  }

  function handleRevoke(id: number) {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    startTransition(async () => {
      await revokeApiKey(id);
    });
  }

  return (
    <div>
      {newPlaintext && (
        <div className="mb-4 rounded-xl border border-sonate-orange/30 bg-sonate-orange/5 p-4">
          <p className="mb-2 text-sm font-semibold text-sonate-orange">
            Clé créée : copie-la maintenant, elle ne sera plus jamais affichée en entier.
          </p>
          <code className="block break-all rounded-lg bg-white px-3 py-2 text-sm font-mono text-sonate-green">
            {newPlaintext}
          </code>
          <button
            type="button"
            onClick={() => setNewPlaintext(null)}
            className="mt-2 text-xs font-semibold text-sonate-muted hover:text-sonate-green"
          >
            J&apos;ai noté la clé, masquer
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <label className={labelClass}>Nom de la clé</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Make - import Deuxio"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Espace</label>
          <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className={fieldClass}>
            {workspaces.length === 0 && <option value="">Aucun espace disponible</option>}
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending || !label.trim() || workspaces.length === 0}
          className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark disabled:opacity-50"
        >
          Créer
        </button>
      </form>
      {error && <p className="mb-4 text-sm font-medium text-sonate-red">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sonate-green/10 bg-sonate-green/5 text-xs font-semibold uppercase tracking-wide text-sonate-muted">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Espace</th>
              <th className="px-4 py-3">Clé</th>
              <th className="px-4 py-3">Créée le</th>
              <th className="px-4 py-3">Dernière utilisation</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-sonate-green/5 last:border-0">
                <td className="px-4 py-3 font-medium">{k.label}</td>
                <td className="px-4 py-3 text-sonate-muted">
                  {k.workspaceName ?? <span className="font-semibold text-sonate-red">Aucun (ancienne clé)</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-sonate-muted">••••{k.keyPreview}</td>
                <td className="px-4 py-3 text-sonate-muted">{formatDate(k.createdAt)}</td>
                <td className="px-4 py-3 text-sonate-muted">{formatDate(k.lastUsedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleRevoke(k.id)}
                    className="text-xs font-semibold text-sonate-red hover:underline"
                  >
                    Révoquer
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sonate-muted">
                  Aucune clé pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
