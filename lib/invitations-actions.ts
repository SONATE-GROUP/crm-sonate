"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  userInvitations,
  users,
  workspaceMembers,
  WORKSPACE_MEMBER_ROLE_VALUES,
  type WorkspaceMemberRole,
} from "@/db/schema";
import { createSessionCookieValue, isValidEmailFormat, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/session";

const INVITATION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type InvitationFormState = { error?: string } | undefined;

function isMemberRole(value: string): value is WorkspaceMemberRole {
  return (WORKSPACE_MEMBER_ROLE_VALUES as readonly string[]).includes(value);
}

/** Invite un email à rejoindre le CRM — envoie un vrai email (Resend) avec un lien d'activation. */
export async function createInvitation(_prevState: InvitationFormState, formData: FormData): Promise<InvitationFormState> {
  const admin = await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const workspaceIdRaw = String(formData.get("workspaceId") ?? "");
  const workspaceId = workspaceIdRaw ? Number(workspaceIdRaw) : null;
  const roleParam = String(formData.get("workspaceRole") ?? "reader");
  const workspaceRole = isMemberRole(roleParam) ? roleParam : "reader";

  if (!isValidEmailFormat(email)) return { error: "Adresse email invalide." };

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) return { error: "Un compte existe déjà avec cet email." };

  // Une seule invitation "pending" à la fois par email : la précédente est révoquée.
  await db
    .update(userInvitations)
    .set({ status: "revoked" })
    .where(and(eq(userInvitations.email, email), eq(userInvitations.status, "pending")));

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITATION_MAX_AGE_MS);

  await db.insert(userInvitations).values({
    email,
    workspaceId,
    workspaceRole,
    token,
    invitedByEmail: admin.email,
    expiresAt,
  });

  const hdrs = await headers();
  const host = hdrs.get("host");
  const isLocal = host?.startsWith("localhost") || host?.startsWith("127.");
  const origin = host ? `${isLocal ? "http" : "https"}://${host}` : "";
  const link = `${origin}/invite/${token}`;

  const result = await sendEmail(
    email,
    "Invitation à rejoindre le CRM Sonate",
    `<p>Bonjour,</p>
     <p><strong>${admin.fullName}</strong> t'invite à rejoindre le CRM Sonate.</p>
     <p><a href="${link}">Clique ici pour activer ton compte</a></p>
     <p>Ce lien expire dans 7 jours.</p>`
  );
  if (!result.ok) {
    await db.delete(userInvitations).where(eq(userInvitations.token, token));
    return { error: `Email non envoyé : ${result.error}` };
  }

  revalidatePath("/settings/users");
}

export async function revokeInvitation(id: number) {
  await requireAdmin();
  await db.update(userInvitations).set({ status: "revoked" }).where(eq(userInvitations.id, id));
  revalidatePath("/settings/users");
}

export type AcceptInvitationState = { error?: string } | undefined;

/** Activation du compte par l'invité, depuis /invite/[token] — non-admin, pas de session requise. */
export async function acceptInvitation(
  token: string,
  _prevState: AcceptInvitationState,
  formData: FormData
): Promise<AcceptInvitationState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const [invitation] = await db.select().from(userInvitations).where(eq(userInvitations.token, token)).limit(1);
  if (!invitation || invitation.status !== "pending") return { error: "Invitation invalide ou déjà utilisée." };
  if (invitation.expiresAt.getTime() < Date.now()) return { error: "Cette invitation a expiré." };
  if (!fullName) return { error: "Le nom complet est requis." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, invitation.email)).limit(1);
  if (existingUser) return { error: "Un compte existe déjà avec cet email — connecte-toi directement." };

  const [createdUser] = await db
    .insert(users)
    .values({ email: invitation.email, fullName, passwordHash: bcrypt.hashSync(password, 10), role: "user" })
    .returning({ id: users.id });

  if (invitation.workspaceId) {
    await db
      .insert(workspaceMembers)
      .values({ workspaceId: invitation.workspaceId, userId: createdUser.id, role: invitation.workspaceRole })
      .onConflictDoNothing({ target: [workspaceMembers.workspaceId, workspaceMembers.userId] });
  }

  await db
    .update(userInvitations)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(userInvitations.id, invitation.id));

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSessionCookieValue(createdUser.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect("/select-workspace");
}
