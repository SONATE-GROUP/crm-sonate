"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { InvitationStatus, WorkspaceMemberRole } from "@/db/schema";
import { createInvitation, revokeInvitation } from "@/lib/invitations-actions";
import { fieldClass, labelClass } from "@/lib/ui";

type Invitation = {
  id: number;
  email: string;
  status: InvitationStatus;
  workspaceId: number | null;
  workspaceName: string | null;
  workspaceRole: WorkspaceMemberRole;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  isExpired: boolean;
};

type WorkspaceOption = { id: number; name: string };

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function StatusBadge({ status, isExpired }: { status: InvitationStatus; isExpired: boolean }) {
  if (status === "pending" && isExpired) {
    return <span className="rounded-full bg-sonate-muted/10 px-2.5 py-1 text-xs font-semibold text-sonate-muted">Expirée</span>;
  }
  if (status === "accepted") {
    return <span className="rounded-full bg-sonate-green/10 px-2.5 py-1 text-xs font-semibold text-sonate-green">Compte activé</span>;
  }
  if (status === "revoked") {
    return <span className="rounded-full bg-sonate-red/10 px-2.5 py-1 text-xs font-semibold text-sonate-red">Révoquée</span>;
  }
  return <span className="rounded-full bg-sonate-orange/10 px-2.5 py-1 text-xs font-semibold text-sonate-orange">En attente</span>;
}

export function InvitationManager({
  initialInvitations,
  workspaces,
}: {
  initialInvitations: Invitation[];
  workspaces: WorkspaceOption[];
}) {
  const router = useRouter();
  const [invitations, setInvitations] = useState(initialInvitations);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createInvitation(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  function handleRevoke(id: number) {
    setInvitations((prev) => prev.map((i) => (i.id === id ? { ...i, status: "revoked" } : i)));
    startTransition(async () => {
      await revokeInvitation(id);
      router.refresh();
    });
  }

  return (
    <div>
      <form
        ref={formRef}
        action={handleCreate}
        className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-sonate-green/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label className={labelClass}>Email du compte</label>
          <input type="email" name="email" required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Espace</label>
          <select name="workspaceId" defaultValue="" className={fieldClass}>
            <option value="">Aucun espace</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Rôle dans l&apos;espace</label>
          <select name="workspaceRole" defaultValue="reader" className={fieldClass}>
            <option value="owner">Propriétaire</option>
            <option value="reader">Lecteur</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark disabled:opacity-50"
          >
            Envoyer une invitation
          </button>
        </div>
      </form>
      {error && <p className="mb-4 text-sm font-medium text-sonate-red">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sonate-green/10 bg-sonate-green/5 text-xs font-semibold uppercase tracking-wide text-sonate-muted">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Espace</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Envoyée le</th>
              <th className="px-4 py-3">Expire / activée le</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((i) => (
              <tr key={i.id} className="border-b border-sonate-green/5 last:border-0">
                <td className="px-4 py-3 font-medium">{i.email}</td>
                <td className="px-4 py-3 text-sonate-muted">{i.workspaceName ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={i.status} isExpired={i.isExpired} />
                </td>
                <td className="px-4 py-3 text-sonate-muted">{formatDate(i.createdAt)}</td>
                <td className="px-4 py-3 text-sonate-muted">{formatDate(i.acceptedAt ?? i.expiresAt)}</td>
                <td className="px-4 py-3 text-right">
                  {i.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(i.id)}
                      className="text-xs font-semibold text-sonate-red hover:underline"
                    >
                      Révoquer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invitations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sonate-muted">
                  Aucune invitation envoyée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
