"use client";

import { useActionState } from "react";

import { login } from "@/lib/auth-actions";
import { fieldClass, labelClass } from "@/lib/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className={labelClass}>Adresse email</label>
        <input type="email" name="username" required autoFocus placeholder="prenom@sonate.group" className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>Mot de passe</label>
        <input type="password" name="password" required className={fieldClass} />
      </div>
      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-sonate-orange px-5 py-2.5 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark disabled:opacity-60"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
