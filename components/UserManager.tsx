"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { UserRole } from "@/db/schema";
import { createUser, deleteUser } from "@/lib/users-actions";
import { fieldClass, labelClass } from "@/lib/ui";

type UserRow = { id: number; email: string; fullName: string; role: UserRole; createdAt: Date };

export function UserManager({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: number }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createUser(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  function handleDelete(id: number) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    startTransition(async () => {
      await deleteUser(id);
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
          <label className={labelClass}>Nom complet</label>
          <input type="text" name="fullName" required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" name="email" required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Mot de passe</label>
          <input type="password" name="password" required minLength={8} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Rôle</label>
          <select name="role" defaultValue="user" className={fieldClass}>
            <option value="user">Utilisateur</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="lg:col-span-4">
          {error && <p className="mb-2 text-sm font-medium text-sonate-red">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark disabled:opacity-50"
          >
            Créer le compte
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sonate-green/10 bg-sonate-green/5 text-xs font-semibold uppercase tracking-wide text-sonate-muted">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Créé le</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-sonate-green/5 last:border-0">
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3 text-sonate-muted">{u.email}</td>
                <td className="px-4 py-3">
                  {u.role === "admin" ? (
                    <span className="rounded-full bg-sonate-orange/10 px-2.5 py-1 text-xs font-semibold text-sonate-orange">
                      Admin
                    </span>
                  ) : (
                    <span className="text-sonate-muted">Utilisateur</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sonate-muted">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3 text-right">
                  {u.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(u.id)}
                      className="text-xs font-semibold text-sonate-red hover:underline"
                    >
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sonate-muted">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
