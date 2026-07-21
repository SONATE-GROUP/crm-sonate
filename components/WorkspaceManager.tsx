"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { createWorkspace } from "@/lib/workspaces-actions";
import { fieldClass, labelClass } from "@/lib/ui";

type WorkspaceRow = { id: number; name: string; membersCount: number; companiesCount: number };

export function WorkspaceManager({ initialWorkspaces }: { initialWorkspaces: WorkspaceRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createWorkspace(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <div>
      <form ref={formRef} action={handleCreate} className="mb-6 flex items-end gap-2">
        <div className="flex-1">
          <label className={labelClass}>Nom du nouvel espace</label>
          <input type="text" name="name" required placeholder="Ex: Client Acme" className={fieldClass} />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark disabled:opacity-50"
        >
          Créer l&apos;espace
        </button>
      </form>
      {error && <p className="mb-4 text-sm font-medium text-sonate-red">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sonate-green/10 bg-sonate-green/5 text-xs font-semibold uppercase tracking-wide text-sonate-muted">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Membres</th>
              <th className="px-4 py-3">Entreprises</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {initialWorkspaces.map((w) => (
              <tr key={w.id} className="border-b border-sonate-green/5 last:border-0">
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-sonate-muted">{w.membersCount}</td>
                <td className="px-4 py-3 text-sonate-muted">{w.companiesCount}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/settings/workspaces/${w.id}`} className="text-xs font-semibold text-sonate-orange hover:underline">
                    Gérer →
                  </Link>
                </td>
              </tr>
            ))}
            {initialWorkspaces.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sonate-muted">
                  Aucun espace pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
