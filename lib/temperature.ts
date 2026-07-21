import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/db/client";
import { contacts, conversationMessages, CONTACT_TEMPERATURE_VALUES, type ContactTemperature } from "@/db/schema";

const client = new Anthropic();

const TEMPERATURE_SCHEMA = {
  type: "object",
  properties: {
    temperature: { type: "string", enum: CONTACT_TEMPERATURE_VALUES as unknown as string[] },
    reason: { type: "string", description: "Justification en une phrase, en français." },
  },
  required: ["temperature", "reason"],
  additionalProperties: false,
};

export type ConversationForClassification = {
  direction: "inbound" | "outbound";
  channel: "linkedin" | "email";
  body: string;
  sentAt: Date;
};

/**
 * Classe la "température" d'une conversation (chaud/froid/rdv pris/perdu/à
 * relancer) via Claude, à partir de son historique complet. Volontairement
 * un modèle bon marché et rapide (pas de thinking, effort bas) : c'est une
 * classification appelée à chaque nouveau message entrant, pas une tâche
 * de raisonnement complexe.
 */
export async function classifyConversationTemperature(
  messages: ConversationForClassification[]
): Promise<{ temperature: ContactTemperature; reason: string } | null> {
  if (messages.length === 0) return null;

  const transcript = messages
    .map((m) => `[${m.sentAt.toISOString()}] ${m.direction === "outbound" ? "Nous" : "Prospect"} (${m.channel}): ${m.body}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 512,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: TEMPERATURE_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `Voici l'historique d'une conversation commerciale (LinkedIn / email) avec un prospect :\n\n${transcript}\n\nClassifie la température de cette conversation :\n- "chaud" : le prospect montre un intérêt clair, pose des questions engagées\n- "froid" : réponse évasive, désintérêt, ou silence après relance\n- "rdv_pris" : un rendez-vous ou call a été confirmé\n- "perdu" : refus explicite, désabonnement, ou fin de non-recevoir\n- "a_relancer" : conversation en pause, réponse en attente, pas assez d'info pour trancher`,
      },
    ],
  });

  if (response.stop_reason === "refusal") return null;

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  try {
    const parsed = JSON.parse(textBlock.text);
    if (!CONTACT_TEMPERATURE_VALUES.includes(parsed.temperature)) return null;
    return { temperature: parsed.temperature, reason: parsed.reason };
  } catch {
    return null;
  }
}

/** Relit l'historique de conversation du contact, classe, et enregistre le résultat. */
export async function refreshContactTemperature(contactId: number) {
  const rows = await db
    .select({
      direction: conversationMessages.direction,
      channel: conversationMessages.channel,
      body: conversationMessages.body,
      sentAt: conversationMessages.sentAt,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.contactId, contactId))
    .orderBy(conversationMessages.sentAt);

  const result = await classifyConversationTemperature(rows);
  if (!result) return;

  await db
    .update(contacts)
    .set({
      aiTemperature: result.temperature,
      aiTemperatureReason: result.reason,
      aiTemperatureUpdatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));

  revalidateTag("crm-data", { expire: 0 });
}
