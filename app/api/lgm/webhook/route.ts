import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/db/client";
import { apiKeys, contacts, conversationMessages, type ConversationChannel, type ConversationDirection } from "@/db/schema";
import { hashApiKey } from "@/lib/apiKeys";
import { normalizeEmail, normalizeLinkedinUrl } from "@/lib/normalize";
import { refreshContactTemperature } from "@/lib/temperature";

const CHANNEL_MAP: Record<string, ConversationChannel> = {
  LINKEDIN: "linkedin",
  EMAIL: "email",
};

const DIRECTION_MAP: Record<string, ConversationDirection> = {
  INCOMING: "inbound",
  OUTGOING: "outbound",
};

type LgmInboxMessagePayload = {
  type: string;
  messageChannel?: string;
  lead?: { id?: string; linkedinUrl?: string; email?: string };
  messages?: { id: string; content: string; direction: string; createdAt: string }[];
};

/**
 * Reçoit les événements "nouveau message" poussés par LaGrowthMachine (inbox
 * webhook, cf. doc API LGM) et les range dans conversation_messages, sur la
 * fiche contact trouvée par cascade LinkedIn -> email. LGM exige une réponse
 * 200 en moins de 3s et désactive le webhook après des échecs répétés — cette
 * route reste donc volontairement minimale (une poignée de requêtes SQL) et
 * répond 200 même en cas de lead non reconnu, pour ne jamais se faire couper.
 *
 * Authentification par clé API en query string (LGM ne permet pas de header
 * personnalisé sur ses webhooks) : mêmes clés que /api/leads (table api_keys,
 * générées depuis /settings), passées ici via ?key=... dans l'URL du webhook.
 */
export async function POST(request: NextRequest) {
  const providedKey = request.nextUrl.searchParams.get("key");
  if (!providedKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [matchedKey] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hashApiKey(providedKey)))
    .limit(1);
  if (!matchedKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: LgmInboxMessagePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (payload.type !== "INBOX_MESSAGE" || !payload.messages?.length) {
    return NextResponse.json({ ok: true, skipped: "not_a_message_event" });
  }

  const channel = payload.messageChannel ? CHANNEL_MAP[payload.messageChannel] : undefined;
  if (!channel) {
    console.warn("lgm webhook: canal non supporté", payload.messageChannel);
    return NextResponse.json({ ok: true, skipped: "unsupported_channel" });
  }

  const linkedinUrl = normalizeLinkedinUrl(payload.lead?.linkedinUrl);
  const email = normalizeEmail(payload.lead?.email);

  let contactId: number | null = null;
  if (linkedinUrl) {
    // Comparaison en mémoire après normalisation (pas exprimable en SQL) —
    // même approche que le matching d'entreprise dans lib/ingest.ts, valable
    // tant que la base reste de l'ordre du millier de contacts.
    const withLinkedin = await db
      .select({ id: contacts.id, linkedinUrl: contacts.linkedinUrl })
      .from(contacts)
      .where(sql`${contacts.linkedinUrl} is not null`);
    const match = withLinkedin.find((c) => normalizeLinkedinUrl(c.linkedinUrl) === linkedinUrl);
    if (match) contactId = match.id;
  }
  if (!contactId && email) {
    const [match] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(sql`lower(${contacts.email}) = ${email}`)
      .limit(1);
    if (match) contactId = match.id;
  }

  if (!contactId) {
    console.warn("lgm webhook: aucun contact trouvé pour le lead", payload.lead);
    return NextResponse.json({ ok: true, skipped: "no_matching_contact" });
  }

  let hasNewInboundMessage = false;
  for (const message of payload.messages) {
    const direction = DIRECTION_MAP[message.direction];
    if (!direction) {
      console.warn("lgm webhook: direction de message inconnue", message.direction);
      continue;
    }
    const inserted = await db
      .insert(conversationMessages)
      .values({
        contactId,
        channel,
        direction,
        body: message.content,
        sentAt: new Date(message.createdAt),
        externalId: message.id,
      })
      .onConflictDoNothing({ target: conversationMessages.externalId })
      .returning({ id: conversationMessages.id });
    if (inserted.length > 0 && direction === "inbound") hasNewInboundMessage = true;
  }

  revalidateTag("crm-data", { expire: 0 });

  // Analyse IA de la température de la conversation : uniquement sur un
  // nouveau message reçu (pas sur les messages qu'on envoie nous-mêmes), et
  // en arrière-plan pour ne jamais retarder la réponse au webhook (LGM exige
  // < 3s et coupe le webhook après des échecs répétés).
  if (hasNewInboundMessage) {
    after(() => refreshContactTemperature(contactId!));
  }

  return NextResponse.json({ ok: true, contactId });
}
