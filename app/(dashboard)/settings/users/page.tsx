import Link from "next/link";
import { redirect } from "next/navigation";

import { InvitationManager } from "@/components/InvitationManager";
import { PageHeader } from "@/components/PageHeader";
import { UserManager } from "@/components/UserManager";
import { listInvitations, listUsers, listWorkspaces } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function UsersSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/settings");

  const [users, invitations, workspaces] = await Promise.all([listUsers(), listInvitations(), listWorkspaces()]);

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

      <h2 className="mb-3 text-lg font-bold text-sonate-green">Inviter un utilisateur par email</h2>
      <p className="mb-4 text-sm text-sonate-muted">
        Un email est envoyé (via Resend, cf. Paramètres) avec un lien pour que la personne active son compte
        elle-même et choisisse son mot de passe.
      </p>
      <div className="mb-10">
        <InvitationManager initialInvitations={invitations} workspaces={workspaces} />
      </div>

      <h2 className="mb-3 text-lg font-bold text-sonate-green">Créer un compte directement</h2>
      <UserManager initialUsers={users} currentUserId={user.id} />
    </div>
  );
}
