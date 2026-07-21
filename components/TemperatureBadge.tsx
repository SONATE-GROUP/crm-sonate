import { CONTACT_TEMPERATURE_LABELS, type ContactTemperature } from "@/db/schema";

const TONE: Record<ContactTemperature, string> = {
  chaud: "bg-sonate-orange/10 text-sonate-orange-dark",
  rdv_pris: "bg-sonate-green/10 text-sonate-green",
  a_relancer: "bg-sonate-muted/10 text-sonate-muted",
  froid: "bg-sonate-muted/10 text-sonate-muted",
  perdu: "bg-sonate-red/10 text-sonate-red",
};

export function TemperatureBadge({
  temperature,
  reason,
}: {
  temperature: ContactTemperature | null;
  reason?: string | null;
}) {
  if (!temperature) return null;

  return (
    <span
      title={reason ?? undefined}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[temperature]}`}
    >
      {CONTACT_TEMPERATURE_LABELS[temperature]}
    </span>
  );
}
