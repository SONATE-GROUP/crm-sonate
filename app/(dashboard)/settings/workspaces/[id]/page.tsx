import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { WorkspaceDetailManager } from "@/components/WorkspaceDetailManager";
import { getWorkspaceDetail, listCompaniesForWorkspaceAssignment } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/settings");

  const { id } = await params;
  const workspaceId = Number(id);
  if (!Number.isInteger(workspaceId)) notFound();

  const detail = await getWorkspaceDetail(workspaceId);
  if (!detail) notFound();

  const allCompanies = await listCompaniesForWorkspaceAssignment();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title={detail.workspace.name} />
      <Link
        href="/settings/workspaces"
        className="mb-6 inline-block text-sm font-medium text-sonate-muted hover:text-sonate-orange"
      >
        ← Retour aux espaces
      </Link>
      <WorkspaceDetailManager
        workspaceId={detail.workspace.id}
        workspaceName={detail.workspace.name}
        initialMembers={detail.members}
        allCompanies={allCompanies}
      />
    </div>
  );
}
