import { Resend } from "resend";

import { getAnyIntegrationSetting } from "@/lib/queries";

// Domaine de test partagé Resend : fonctionne sans vérification de domaine,
// vers n'importe quel destinataire. À remplacer par une adresse sur un
// domaine vérifié une fois que Sonate en a configuré un dans Resend.
const FROM_ADDRESS = "Sonate CRM <onboarding@resend.dev>";

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const apiKey = await getAnyIntegrationSetting("resend");
  if (!apiKey) {
    return { ok: false, error: "Clé API Resend non configurée (/settings)." };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
  if (error) {
    console.error("sendEmail: échec Resend", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
