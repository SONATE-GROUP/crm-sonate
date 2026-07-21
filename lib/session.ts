import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users, workspaceMembers, type UserRole } from "@/db/schema";
import { SESSION_COOKIE, verifySessionCookieValue } from "@/lib/auth";
import { listWorkspacesForScope } from "@/lib/queries";

export type CurrentUser = {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  isAdmin: boolean;
  workspaceIds: number[];
};

/** Utilisateur connecté, avec rôle et espaces (Server Components/Actions/Route Handlers uniquement). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const userId = await verifySessionCookieValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isAdmin: user.role === "admin",
    workspaceIds: memberships.map((m) => m.workspaceId),
  };
}

/** Email de l'utilisateur connecté (raccourci pour les usages qui n'ont besoin que de ça). */
export async function getCurrentUserEmail(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.email ?? null;
}

/** Utilisateur admin connecté, ou lève une erreur — à utiliser en tête des Server Actions réservées aux admins. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Accès réservé aux administrateurs.");
  return user;
}

// Comme HubSpot : on opère toujours dans UN espace à la fois, même en tant
// qu'admin (pas de vue "tous espaces confondus"). L'espace actif choisi est
// mémorisé dans ce cookie ; la valeur n'a pas besoin d'être signée car elle
// est revalidée à chaque lecture contre les espaces réellement accessibles à
// l'utilisateur (cf. resolveActiveWorkspace) — une valeur trafiquée pointant
// vers un espace non autorisé est simplement ignorée.
export const ACTIVE_WORKSPACE_COOKIE = "crm_active_workspace";
export const ACTIVE_WORKSPACE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type WorkspaceOption = { id: number; name: string };

export type ActiveWorkspaceResolution =
  | { status: "resolved"; workspaceId: number; available: WorkspaceOption[] }
  | { status: "needs_selection"; available: WorkspaceOption[] }
  | { status: "no_workspace" };

/**
 * Détermine l'espace actif à partir du cookie (revalidé contre les espaces
 * accessibles) ou, s'il n'y en a qu'un seul possible, le sélectionne
 * automatiquement — pas besoin de forcer un choix quand il n'y a pas de choix.
 */
export async function resolveActiveWorkspace(user: CurrentUser): Promise<ActiveWorkspaceResolution> {
  const available = await listWorkspacesForScope({ isAdmin: user.isAdmin, workspaceIds: user.workspaceIds });
  if (available.length === 0) return { status: "no_workspace" };

  const cookieStore = await cookies();
  const cookieValue = Number(cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value);
  if (Number.isInteger(cookieValue) && available.some((w) => w.id === cookieValue)) {
    return { status: "resolved", workspaceId: cookieValue, available };
  }
  if (available.length === 1) {
    return { status: "resolved", workspaceId: available[0].id, available };
  }
  return { status: "needs_selection", available };
}

/**
 * À appeler en tête des pages de données (entreprises/contacts/deals) :
 * garantit un utilisateur connecté ET un espace actif, sinon redirige vers
 * /login ou /select-workspace.
 */
export async function requireActiveWorkspace(nextPath: string): Promise<{ user: CurrentUser; workspaceId: number }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolution = await resolveActiveWorkspace(user);
  if (resolution.status !== "resolved") {
    redirect(`/select-workspace?next=${encodeURIComponent(nextPath)}`);
  }
  return { user, workspaceId: resolution.workspaceId };
}
