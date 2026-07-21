import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { WorkspaceManager } from "@/components/WorkspaceManager";
import { listWorkspaces } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function WorkspacesSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/settings");

  const workspaces = await listWorkspaces();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="Espaces clients" />
      <Link href="/settings" className="mb-6 inline-block text-sm font-medium text-sonate-muted hover:text-sonate-orange">
        ← Retour aux paramètres
      </Link>
      <p className="mb-6 text-sm text-sonate-muted">
        Un espace regroupe des entreprises et les utilisateurs qui doivent y avoir accès. Les admins voient toujours
        tous les espaces, sans avoir besoin d&apos;y être ajoutés.
      </p>
      <WorkspaceManager initialWorkspaces={workspaces} />
    </div>
  );
}
