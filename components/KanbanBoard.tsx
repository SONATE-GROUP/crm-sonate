"use client";

import { useState } from "react";

import { DEAL_STATUS_LABELS, DEAL_STATUS_VALUES, type DealStatus } from "@/db/schema";
import type { KanbanDeal } from "@/lib/queries";
import { updateDealStatus } from "@/lib/actions";
import { KanbanCard } from "@/components/KanbanCard";

type ColumnsState = Record<DealStatus, KanbanDeal[]>;

function groupByStatus(deals: KanbanDeal[]): ColumnsState {
  const columns = Object.fromEntries(DEAL_STATUS_VALUES.map((s) => [s, [] as KanbanDeal[]])) as ColumnsState;
  for (const deal of deals) {
    // deal.status peut être null (jamais qualifié) ou, pour une donnée
    // historique corrompue, une valeur hors de l'enum courant : dans les
    // deux cas la deal n'a pas sa place dans une colonne et est ignorée
    // plutôt que de faire planter le board.
    if (deal.status && columns[deal.status]) columns[deal.status].push(deal);
  }
  return columns;
}

export function KanbanBoard({ deals }: { deals: KanbanDeal[] }) {
  const [columns, setColumns] = useState<ColumnsState>(() => groupByStatus(deals));
  const [error, setError] = useState<string | null>(null);

  function handleDrop(toStatus: DealStatus, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    const { dealId, fromStatus } = JSON.parse(raw) as { dealId: number; fromStatus: DealStatus };
    if (fromStatus === toStatus) return;

    let movedDeal: KanbanDeal | undefined;
    setColumns((prev) => {
      const fromList = prev[fromStatus];
      const idx = fromList.findIndex((d) => d.id === dealId);
      if (idx === -1) return prev;
      movedDeal = { ...fromList[idx], status: toStatus };
      return {
        ...prev,
        [fromStatus]: [...fromList.slice(0, idx), ...fromList.slice(idx + 1)],
        [toStatus]: [movedDeal, ...prev[toStatus]],
      };
    });
    setError(null);

    updateDealStatus(dealId, toStatus).catch(() => {
      setError("Le changement de statut a échoué, la carte a été remise à sa place.");
      setColumns((prev) => {
        if (!movedDeal) return prev;
        const toList = prev[toStatus];
        const idx = toList.findIndex((d) => d.id === dealId);
        if (idx === -1) return prev;
        const reverted = { ...movedDeal, status: fromStatus };
        return {
          ...prev,
          [toStatus]: [...toList.slice(0, idx), ...toList.slice(idx + 1)],
          [fromStatus]: [reverted, ...prev[fromStatus]],
        };
      });
    });
  }

  return (
    <div>
      {error && <p className="mb-3 rounded-xl bg-sonate-red/10 px-4 py-2 text-sm font-medium text-sonate-red">{error}</p>}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {DEAL_STATUS_VALUES.map((status) => (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(status, e)}
            className="flex w-72 shrink-0 flex-col rounded-2xl bg-sonate-green/5 p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-sonate-green">{DEAL_STATUS_LABELS[status]}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-sonate-muted">
                {columns[status].length}
              </span>
            </div>
            <div className="flex min-h-[40px] flex-col gap-2">
              {columns[status].map((deal) => (
                <KanbanCard key={deal.id} deal={deal} fromStatus={status} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
