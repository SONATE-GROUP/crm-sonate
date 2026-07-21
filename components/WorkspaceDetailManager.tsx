"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import type { WorkspaceMemberRole } from "@/db/schema";
import { addWorkspaceMember, assignCompanyWorkspace, removeWorkspaceMember, renameWorkspace } from "@/lib/workspaces-actions";
import { fieldClass, labelClass } from "@/lib/ui";

type Member = { membershipId: number; role: WorkspaceMemberRole; userId: number; email: string; fullName: string };
type Company = { id: number; name: string; workspaceId: number | null };

export function WorkspaceDetailManager({
  workspaceId,
  workspaceName,
  initialMembers,
  allCompanies,
}: {
  workspaceId: number;
  workspaceName: string;
  initialMembers: Member[];
  allCompanies: Company[];
}) {
  const router = useRouter();
  const [name, setName] = useState(workspaceName);
  const [members, setMembers] = useState(initialMembers);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const memberFormRef = useRef<HTMLFormElement>(null);

  const inWorkspace = useMemo(() => allCompanies.filter((c) => c.workspaceId === workspaceId), [allCompanies, workspaceId]);
  const available = useMemo(
    () =>
      allCompanies
        .filter((c) => c.workspaceId !== workspaceId)
        .filter((c) => c.name.toLowerCase().includes(companyFilter.toLowerCase())),
    [allCompanies, workspaceId, companyFilter]
  );

  function handleRename(formData: FormData) {
    startTransition(async () => {
      await renameWorkspace(workspaceId, formData);
      router.refresh();
    });
  }

  function handleAddMember(formData: FormData) {
    setMemberError(null);
    startTransition(async () => {
      const result = await addWorkspaceMember(workspaceId, undefined, formData);
      if (result?.error) {
        setMemberError(result.error);
        return;
      }
      memberFormRef.current?.reset();
      router.refresh();
    });
  }

  function handleRemoveMember(membershipId: number) {
    setMembers((prev) => prev.filter((m) => m.membershipId !== membershipId));
    startTransition(async () => {
      await removeWorkspaceMember(workspaceId, membershipId);
      router.refresh();
    });
  }

  function handleAssign(companyId: number, targetWorkspaceId: number | null) {
    startTransition(async () => {
      await assignCompanyWorkspace(companyId, targetWorkspaceId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-bold text-sonate-green">Nom de l&apos;espace</h2>
        <form
          action={(formData) => {
            handleRename(formData);
          }}
          className="flex items-end gap-2"
        >
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={`${fieldClass} max-w-sm`}
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark disabled:opacity-50"
          >
            Renommer
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-sonate-green">Membres ({members.length})</h2>
        <form
          ref={memberFormRef}
          action={(formData) => {
            handleAddMember(formData);
          }}
          className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-sonate-green/10 bg-white p-4 sm:grid-cols-3"
        >
          <div>
            <label className={labelClass}>Email de l&apos;utilisateur</label>
            <input type="email" name="email" required className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Rôle</label>
            <select name="role" defaultValue="owner" className={fieldClass}>
              <option value="owner">Propriétaire</option>
              <option value="reader">Lecteur</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        </form>
        {memberError && <p className="mb-4 text-sm font-medium text-sonate-red">{memberError}</p>}

        <div className="overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sonate-green/10 bg-sonate-green/5 text-xs font-semibold uppercase tracking-wide text-sonate-muted">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.membershipId} className="border-b border-sonate-green/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{m.fullName}</td>
                  <td className="px-4 py-3 text-sonate-muted">{m.email}</td>
                  <td className="px-4 py-3 text-sonate-muted">{m.role === "owner" ? "Propriétaire" : "Lecteur"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.membershipId)}
                      className="text-xs font-semibold text-sonate-red hover:underline"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sonate-muted">
                    Aucun membre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-sonate-green">Entreprises dans cet espace ({inWorkspace.length})</h2>
        <div className="mb-6 overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white">
          <table className="w-full text-left text-sm">
            <tbody>
              {inWorkspace.map((c) => (
                <tr key={c.id} className="border-b border-sonate-green/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleAssign(c.id, null)}
                      className="text-xs font-semibold text-sonate-red hover:underline"
                    >
                      Retirer de l&apos;espace
                    </button>
                  </td>
                </tr>
              ))}
              {inWorkspace.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-sonate-muted">
                    Aucune entreprise dans cet espace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 text-sm font-semibold text-sonate-green">Ajouter une entreprise</h3>
        <input
          type="text"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          placeholder="Rechercher une entreprise…"
          className={`${fieldClass} mb-3 max-w-sm`}
        />
        <div className="max-h-64 overflow-y-auto overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white">
          <table className="w-full text-left text-sm">
            <tbody>
              {available.slice(0, 100).map((c) => (
                <tr key={c.id} className="border-b border-sonate-green/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleAssign(c.id, workspaceId)}
                      className="text-xs font-semibold text-sonate-orange hover:underline"
                    >
                      Ajouter
                    </button>
                  </td>
                </tr>
              ))}
              {available.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-sonate-muted">
                    Aucune entreprise correspondante.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
