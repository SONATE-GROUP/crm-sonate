"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSessionCookieValue, getAccounts, isValidEmailFormat, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextParam = String(formData.get("next") ?? "/companies");
  const next = nextParam.startsWith("/") ? nextParam : "/companies";

  if (!isValidEmailFormat(username)) {
    return { error: "L'identifiant doit être une adresse email." };
  }

  const hash = getAccounts()[username];
  if (!hash || !bcrypt.compareSync(password, hash)) {
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionCookieValue(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
