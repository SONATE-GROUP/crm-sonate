"use client";

import { useState } from "react";

import { DEAL_STATUS_LABELS, DEAL_STATUS_VALUES, type DealStatus } from "@/db/schema";
import { updateDealStatus } from "@/lib/actions";

export function DealStatusSelect({ dealId, status }: { dealId: number; status: DealStatus | null }) {
  const [current, setCurrent] = useState<DealStatus | null>(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as DealStatus;
    const previous = current;
    setCurrent(next);
    setSaving(true);
    setError(null);
    try {
      await updateDealStatus(dealId, next);
    } catch {
      setCurrent(previous);
      setError("Échec de la mise à jour.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <select
        value={current ?? ""}
        onChange={handleChange}
        disabled={saving}
        className="w-full rounded-lg border border-sonate-green/15 bg-white px-2 py-1.5 text-sm font-medium text-sonate-green disabled:opacity-60"
      >
        {!current && <option value="">Sans statut</option>}
        {DEAL_STATUS_VALUES.map((value) => (
          <option key={value} value={value}>
            {DEAL_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs font-medium text-sonate-red">{error}</p>}
    </div>
  );
}
