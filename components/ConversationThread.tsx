import { MessageCircle, Mail } from "lucide-react";

import type { ConversationMessage } from "@/lib/queries";

const CHANNEL_ICON = {
  linkedin: MessageCircle,
  email: Mail,
} as const;

const CHANNEL_LABEL = {
  linkedin: "LinkedIn",
  email: "Email",
} as const;

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationThread({ messages }: { messages: ConversationMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-sonate-muted">
        Aucune conversation pour l&apos;instant. Les échanges LinkedIn et email remonteront ici une fois la synchro
        LaGrowthMachine activée.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const Icon = CHANNEL_ICON[message.channel];
        const isOutbound = message.direction === "outbound";
        return (
          <div key={message.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                isOutbound
                  ? "bg-sonate-green text-sonate-cream"
                  : "border border-sonate-green/10 bg-white text-sonate-green"
              }`}
            >
              <div
                className={`mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                  isOutbound ? "text-sonate-cream/70" : "text-sonate-muted"
                }`}
              >
                <Icon size={12} />
                <span>{CHANNEL_LABEL[message.channel]}</span>
                <span>·</span>
                <span>{isOutbound ? "Nous" : "Prospect"}</span>
              </div>
              {message.subject && <p className="mb-1 font-semibold">{message.subject}</p>}
              <p className="whitespace-pre-wrap">{message.body}</p>
              <p className={`mt-1.5 text-xs ${isOutbound ? "text-sonate-cream/60" : "text-sonate-muted"}`}>
                {formatDateTime(message.sentAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
