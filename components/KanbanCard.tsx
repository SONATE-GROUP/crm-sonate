"use client";

import Link from "next/link";

import type { DealStatus } from "@/db/schema";
import type { KanbanDeal } from "@/lib/queries";

export function KanbanCard({ deal, fromStatus }: { deal: KanbanDeal; fromStatus: DealStatus }) {
  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("text/plain", JSON.stringify({ dealId: deal.id, fromStatus }));
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      data-deal-id={deal.id}
      className="cursor-grab rounded-xl border border-sonate-green/10 bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <Link
        href={`/companies/${deal.companyId}`}
        draggable={false}
        className="block truncate text-sm font-semibold hover:text-sonate-orange"
      >
        {deal.companyName}
      </Link>
      {deal.contactFullName && <p className="mt-0.5 truncate text-xs text-sonate-muted">{deal.contactFullName}</p>}
      <div className="mt-2 flex items-center justify-between text-xs text-sonate-muted">
        <span className="truncate">{deal.owner ?? "—"}</span>
        {deal.score !== null && <span className="shrink-0 font-bold text-sonate-orange">{deal.score}</span>}
      </div>
      {deal.montantDevis !== null && (
        <p className="mt-1 text-xs font-medium text-sonate-green">{deal.montantDevis.toLocaleString("fr-FR")} €</p>
      )}
      <Link
        href={`/deals/${deal.id}`}
        draggable={false}
        className="mt-2 block text-right text-xs font-medium text-sonate-orange hover:underline"
      >
        Deal #{deal.id} →
      </Link>
    </div>
  );
}
