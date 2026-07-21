import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { UserManager } from "@/components/UserManager";
import { listUsers } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function UsersSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/settings");

  const users = await listUsers();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="Utilisateurs" />
      <Link href="/settings" className="mb-6 inline-block text-sm font-medium text-sonate-muted hover:text-sonate-orange">
        ← Retour aux paramètres
      </Link>
      <p className="mb-6 text-sm text-sonate-muted">
        Un admin a accès à tous les espaces. Un utilisateur normal ne voit que les entreprises rattachées aux espaces
        dont il est membre (cf. Espaces).
      </p>
      <UserManager initialUsers={users} currentUserId={user.id} />
    </div>
  );
}
