import Link from "next/link";

import { AcceptInvitationForm } from "@/components/AcceptInvitationForm";
import { getInvitationByToken } from "@/lib/queries";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);
  const invalid = !invitation || invitation.status !== "pending" || invitation.isExpired;

  return (
    <div className="flex min-h-screen items-center justify-center bg-sonate-cream px-4">
      <div className="w-full max-w-sm rounded-2xl border border-sonate-green/10 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-extrabold tracking-tight text-sonate-green">Sonate</p>
          <p className="mt-1 text-sm text-sonate-muted">CRM interne</p>
        </div>

        {invalid ? (
          <div className="text-center">
            <p className="mb-4 text-sm text-sonate-muted">
              {invitation?.isExpired ? "Cette invitation a expiré." : "Cette invitation n'est plus valide."}
            </p>
            <Link href="/login" className="text-sm font-semibold text-sonate-orange hover:underline">
              Aller à la connexion →
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-center text-sm text-sonate-muted">
              Active ton compte pour <span className="font-semibold text-sonate-green">{invitation.email}</span>
            </p>
            <AcceptInvitationForm token={token} />
          </>
        )}
      </div>
    </div>
  );
}
