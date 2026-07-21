"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { users, USER_ROLE_VALUES, type UserRole } from "@/db/schema";
import { isValidEmailFormat } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";

export type UserFormState = { error?: string } | undefined;

function isUserRole(value: string): value is UserRole {
  return (USER_ROLE_VALUES as readonly string[]).includes(value);
}

export async function createUser(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const roleParam = String(formData.get("role") ?? "user");
  const role = isUserRole(roleParam) ? roleParam : "user";

  if (!isValidEmailFormat(email)) return { error: "Adresse email invalide." };
  if (!fullName) return { error: "Le nom complet est requis." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "Un compte existe déjà avec cet email." };

  await db.insert(users).values({ email, fullName, role, passwordHash: bcrypt.hashSync(password, 10) });
  revalidatePath("/settings/users");
}

export async function deleteUser(userId: number) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error("Impossible de supprimer son propre compte.");
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/settings/users");
}
