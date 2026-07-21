"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { listWorkspacesForScope } from "@/lib/queries";
import { ACTIVE_WORKSPACE_COOKIE, ACTIVE_WORKSPACE_MAX_AGE_SECONDS, getCurrentUser } from "@/lib/session";

/** Change l'espace actif de l'utilisateur connecté (cf. /select-workspace) et redirige vers `next`. */
export async function setActiveWorkspace(workspaceId: number, next: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const available = await listWorkspacesForScope({ isAdmin: user.isAdmin, workspaceIds: user.workspaceIds });
  if (!available.some((w) => w.id === workspaceId)) {
    throw new Error("Tu n'as pas accès à cet espace.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, String(workspaceId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACTIVE_WORKSPACE_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect(next.startsWith("/") ? next : "/companies");
}
