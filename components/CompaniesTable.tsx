"use client";

import { useState } from "react";
import Link from "next/link";

import type { CompanyRow } from "@/lib/queries";
import { PendingBadge } from "@/components/PendingBadge";
import { BulkEnrichBar } from "@/components/BulkEnrichBar";

export function CompaniesTable({ rows }: { rows: CompanyRow[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sonate-green/10 bg-sonate-green/5 text-xs font-semibold uppercase tracking-wide text-sonate-muted">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                  aria-label="Tout sélectionner"
                />
              </th>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Secteur</th>
              <th className="px-4 py-3">B2B/B2C</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Contacts</th>
              <th className="px-4 py-3">Deals</th>
              <th className="px-4 py-3">Créée le</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-sonate-green/5 last:border-0 hover:bg-sonate-orange/5">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`Sélectionner ${row.name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/companies/${row.id}`} className="font-semibold hover:text-sonate-orange">
                    {row.name}
                  </Link>
                  <PendingBadge count={row.pendingCount} />
                  <div className="text-xs text-sonate-muted">{row.website ?? ""}</div>
                </td>
                <td className="px-4 py-3">{row.sector ?? "—"}</td>
                <td className="px-4 py-3">{row.b2bB2c ?? "—"}</td>
                <td className="px-4 py-3">{row.sourceSystem}</td>
                <td className="px-4 py-3">{row.contactsCount}</td>
                <td className="px-4 py-3">{row.dealsCount}</td>
                <td className="px-4 py-3 text-sonate-muted">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sonate-muted">
                  Aucun résultat pour ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <BulkEnrichBar entityType="company" selectedIds={[...selected]} onClear={() => setSelected(new Set())} />
      )}
    </div>
  );
}
