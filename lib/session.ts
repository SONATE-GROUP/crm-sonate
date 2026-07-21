import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users, workspaceMembers, type UserRole } from "@/db/schema";
import { SESSION_COOKIE, verifySessionCookieValue } from "@/lib/auth";

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
