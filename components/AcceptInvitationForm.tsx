"use client";

import { useActionState } from "react";

import { acceptInvitation } from "@/lib/invitations-actions";
import { fieldClass, labelClass } from "@/lib/ui";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(acceptInvitation.bind(null, token), undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Nom complet</label>
        <input type="text" name="fullName" required autoFocus className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>Choisis un mot de passe</label>
        <input type="password" name="password" required minLength={8} className={fieldClass} />
      </div>
      {state?.error && <p className="text-sm font-medium text-sonate-red">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-sonate-orange px-5 py-2.5 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark disabled:opacity-60"
      >
        {pending ? "Activation…" : "Activer mon compte"}
      </button>
    </form>
  );
}
