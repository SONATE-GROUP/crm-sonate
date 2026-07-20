import Link from "next/link";
import { LogOut, Settings } from "lucide-react";

import { NavLinks } from "@/components/NavLinks";
import { logout } from "@/lib/auth-actions";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full">
      <aside className="flex w-64 shrink-0 flex-col bg-sonate-green text-sonate-cream">
        <Link href="/companies" className="flex flex-col px-6 py-6 leading-none">
          <span className="text-2xl font-extrabold tracking-tight">Sonate</span>
          <span className="mt-0.5 text-[11px] font-medium text-sonate-cream/60">CRM interne</span>
        </Link>
        <div className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-wide text-sonate-cream/40">
          Pipeline
        </div>
        <NavLinks />
        <div className="mt-auto px-3 pb-6">
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
