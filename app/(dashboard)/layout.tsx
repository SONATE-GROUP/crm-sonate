import Link from "next/link";
import { LogOut, Settings, ShieldCheck, UserCog } from "lucide-react";

import { NavLinks } from "@/components/NavLinks";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { logout } from "@/lib/auth-actions";
import { getCurrentUser, resolveActiveWorkspace } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const resolution = user ? await resolveActiveWorkspace(user) : null;
  const activeWorkspaceName =
    resolution?.status === "resolved" ? resolution.available.find((w) => w.id === resolution.workspaceId)?.name ?? null : null;
  const workspaceOptions = resolution?.status !== "no_workspace" ? resolution?.available ?? [] : [];

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-y-auto bg-sonate-green text-sonate-cream">
        <Link href="/companies" className="flex flex-col px-6 py-6 leading-none">
          <span className="text-2xl font-extrabold tracking-tight">Sonate</span>
          <span className="mt-0.5 text-[11px] font-medium text-sonate-cream/60">CRM interne</span>
        </Link>
        <WorkspaceSwitcher activeName={activeWorkspaceName} options={workspaceOptions} />
        <div className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-wide text-sonate-cream/40">
          Pipeline
        </div>
        <NavLinks />
        <div className="mt-auto px-3 pb-6">
          {user?.isAdmin && (
            <>
              <div className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wide text-sonate-cream/40">
                Administration
              </div>
              <Link
                href="/settings/users"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sonate-cream/70 hover:bg-sonate-cream/10 hover:text-sonate-cream"
              >
                <UserCog size={17} strokeWidth={2} />
                Utilisateurs
              </Link>
              <Link
                href="/settings/workspaces"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sonate-cream/70 hover:bg-sonate-cream/10 hover:text-sonate-cream"
              >
                <ShieldCheck size={17} strokeWidth={2} />
                Espaces clients
              </Link>
            </>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sonate-cream/70 hover:bg-sonate-cream/10 hover:text-sonate-cream"
          >
            <Settings size={17} strokeWidth={2} />
            Paramètres
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sonate-cream/70 hover:bg-sonate-cream/10 hover:text-sonate-cream"
            >
              <LogOut size={17} strokeWidth={2} />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <main>{children}</main>
      </div>
    </div>
  );
}
