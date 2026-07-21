import { redirect } from "next/navigation";

import { logout } from "@/lib/auth-actions";
import { getCurrentUser, resolveActiveWorkspace } from "@/lib/session";
import { setActiveWorkspace } from "@/lib/workspace-session-actions";

export default async function SelectWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const nextParam = sp.next;
  const next = Array.isArray(nextParam) ? nextParam[0] : nextParam;
  const safeNext = next && next.startsWith("/") ? next : "/companies";

  const resolution = await resolveActiveWorkspace(user);

  return (
    <div className="flex min-h-screen items-center justify-center bg-sonate-cream px-4">
      <div className="w-full max-w-sm rounded-2xl border border-sonate-green/10 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-extrabold tracking-tight text-sonate-green">Sonate</p>
          <p className="mt-1 text-sm text-sonate-muted">Choisis ton espace</p>
        </div>

        {resolution.status === "no_workspace" ? (
          <p className="text-center text-sm text-sonate-muted">
            Aucun espace ne t&apos;a été attribué. Demande à un admin de t&apos;ajouter à un espace depuis{" "}
            <span className="font-semibold text-sonate-green">Espaces clients</span>.
          </p>
        ) : (
          <div className="space-y-2">
            {resolution.available.map((w) => (
              <form key={w.id} action={setActiveWorkspace.bind(null, w.id, safeNext)}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-sonate-green/15 px-4 py-3 text-left text-sm font-semibold text-sonate-green transition-colors hover:border-sonate-orange hover:bg-sonate-orange/5"
                >
                  {w.name}
                </button>
              </form>
            ))}
          </div>
        )}

        <form action={logout} className="mt-6 text-center">
          <button type="submit" className="text-xs font-semibold text-sonate-muted hover:text-sonate-green">
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  );
}
