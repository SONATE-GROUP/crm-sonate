import { DEAL_STATUS_LABELS, type DealStatus } from "@/db/schema";

const TONE: Record<DealStatus, string> = {
  gagne: "bg-sonate-green/10 text-sonate-green",
  partenaire_potentiel: "bg-sonate-green/10 text-sonate-green",
  devis_a_envoyer: "bg-sonate-orange/10 text-sonate-orange-dark",
  attente_retour_client: "bg-sonate-orange/10 text-sonate-orange-dark",
  call_reserve: "bg-sonate-orange/10 text-sonate-orange-dark",
  devis_envoye: "bg-sonate-orange/10 text-sonate-orange-dark",
  audit_en_cours: "bg-sonate-orange/10 text-sonate-orange-dark",
  a_relancer_plus_tard: "bg-sonate-muted/10 text-sonate-muted",
  sans_rdv: "bg-sonate-muted/10 text-sonate-muted",
  perdu: "bg-sonate-red/10 text-sonate-red",
  non_pertinent: "bg-sonate-red/10 text-sonate-red",
  lapin: "bg-sonate-red/10 text-sonate-red",
};

export function StatusBadge({ status }: { status: DealStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[status]}`}>
      {DEAL_STATUS_LABELS[status]}
    </span>
  );
}
