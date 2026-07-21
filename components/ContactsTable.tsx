"use client";

import { useState } from "react";
import Link from "next/link";

import type { ContactRow } from "@/lib/queries";
import { PendingBadge } from "@/components/PendingBadge";
import { BulkEnrichBar } from "@/components/BulkEnrichBar";
import { TemperatureBadge } from "@/components/TemperatureBadge";

export function ContactsTable({ rows }: { rows: ContactRow[] }) {
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
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Température</th>
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
                    aria-label={`Sélectionner ${row.fullName}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/contacts/${row.id}`} className="font-semibold hover:text-sonate-orange">
                    {row.fullName}
                  </Link>
                  <PendingBadge count={row.pendingCount} />
                </td>
                <td className="px-4 py-3">{row.email ?? "—"}</td>
                <td className="px-4 py-3">{row.phone ?? "—"}</td>
                <td className="px-4 py-3">{row.role ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/companies/${row.companyId}`} className="text-sonate-orange hover:underline">
                    {row.companyName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <TemperatureBadge temperature={row.aiTemperature} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sonate-muted">
                  Aucun résultat pour cette recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <BulkEnrichBar entityType="contact" selectedIds={[...selected]} onClear={() => setSelected(new Set())} />
      )}
    </div>
  );
}
