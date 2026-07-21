"use server";

import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { revalidateTag } from "next/cache";

import { db } from "@/db/client";
import {
  apiKeys,
  companies,
  users,
  workspaceMembers,
  workspaces,
  WORKSPACE_MEMBER_ROLE_VALUES,
  type WorkspaceMemberRole,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export type WorkspaceFormState = { error?: string } | undefined;

function isMemberRole(value: string): value is WorkspaceMemberRole {
  return (WORKSPACE_MEMBER_ROLE_VALUES as readonly string[]).includes(value);
}

export async function createWorkspace(_prevState: WorkspaceFormState, formData: FormData): Promise<WorkspaceFormState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Le nom de l'espace est requis." };

  await db.insert(workspaces).values({ name });
  revalidatePath("/settings/workspaces");
}

export async function renameWorkspace(workspaceId: number, formData: FormData): Promise<WorkspaceFormState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Le nom de l'espace est requis." };

  await db.update(workspaces).set({ name }).where(eq(workspaces.id, workspaceId));
  revalidatePath(`/settings/workspaces/${workspaceId}`);
  revalidatePath("/settings/workspaces");
}

export async function deleteWorkspace(workspaceId: number) {
  await requireAdmin();
  await db.update(companies).set({ workspaceId: null }).where(eq(companies.workspaceId, workspaceId));
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  revalidatePath("/settings/workspaces");
  revalidateTag("crm-data", { expire: 0 });
}

export async function addWorkspaceMember(
  workspaceId: number,
  _prevState: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleParam = String(formData.get("role") ?? "owner");
  const role = isMemberRole(roleParam) ? roleParam : "owner";

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) return { error: "Aucun utilisateur avec cet email. Crée d'abord son compte." };

  await db.insert(workspaceMembers).values({ workspaceId, userId: user.id, role }).onConflictDoNothing({
    target: [workspaceMembers.workspaceId, workspaceMembers.userId],
  });
  revalidatePath(`/settings/workspaces/${workspaceId}`);
}

export async function removeWorkspaceMember(workspaceId: number, membershipId: number) {
  await requireAdmin();
  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, membershipId));
  revalidatePath(`/settings/workspaces/${workspaceId}`);
}

/**
 * Rattache une entreprise à un espace — définitivement. Comme HubSpot (business
 * units), une entreprise déjà rattachée à un espace ne peut jamais en changer :
 * pas de transfert entre espaces, pour garantir l'étanchéité des données entre
 * clients (RGPD). Seule une entreprise pas encore rattachée (workspaceId null)
 * peut recevoir un premier rattachement ; la suppression de l'espace lui-même
 * (deleteWorkspace) est le seul cas qui remet workspaceId à null.
 */
export async function assignCompanyWorkspace(companyId: number, workspaceId: number): Promise<WorkspaceFormState> {
  await requireAdmin();

  const [company] = await db.select({ workspaceId: companies.workspaceId }).from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) return { error: "Entreprise introuvable." };
  if (company.workspaceId !== null) {
    return { error: "Cette entreprise appartient déjà à un espace : aucun transfert entre espaces n'est autorisé." };
  }

  await db.update(companies).set({ workspaceId }).where(eq(companies.id, companyId));
  revalidatePath("/settings/workspaces");
  revalidateTag("crm-data", { expire: 0 });
}

/**
 * Bascule en une fois toutes les entreprises (et clés API d'ingestion) pas
 * encore rattachées à un espace vers l'espace donné — utile une seule fois
 * pour rattacher les données historiques (importées avant l'introduction des
 * espaces) à un espace par défaut. N'affecte jamais une entreprise/clé déjà
 * rattachée ailleurs (aucun transfert entre espaces).
 */
export async function bulkAssignUnassignedToWorkspace(workspaceId: number) {
  await requireAdmin();

  const [assignedCompanies, assignedKeys] = await Promise.all([
    db.update(companies).set({ workspaceId }).where(isNull(companies.workspaceId)).returning({ id: companies.id }),
    db.update(apiKeys).set({ workspaceId }).where(isNull(apiKeys.workspaceId)).returning({ id: apiKeys.id }),
  ]);

  revalidatePath("/settings/workspaces");
  revalidatePath("/settings");
  revalidateTag("crm-data", { expire: 0 });
  return { companiesAssigned: assignedCompanies.length, keysAssigned: assignedKeys.length };
}
