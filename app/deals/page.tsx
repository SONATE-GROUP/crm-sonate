import Link from "next/link";

import { B2B_B2C_VALUES, DEAL_STATUS_LABELS, DEAL_STATUS_VALUES, type B2bB2c, type DealStatus } from "@/db/schema";
import { listDeals, listOwners, PAGE_SIZE } from "@/lib/queries";

function isDealStatus(value: string): value is DealStatus {
  return (DEAL_STATUS_VALUES as readonly string[]).includes(value);
}

function isB2bB2c(value: string): value is B2bB2c {
  return (B2B_B2C_VALUES as readonly string[]).includes(value);
}

function buildHref(params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/deals?${qs}` : "/deals";
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const get = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const q = get("q");
  const statusParam = get("status");
  const b2bB2cParam = get("b2bB2c");
  const owner = get("owner");
  const scoreMinParam = get("scoreMin");
  const page = Number(get("page") ?? "1") || 1;

  const status = statusParam && isDealStatus(statusParam) ? statusParam : undefined;
  const b2bB2c = b2bB2cParam && isB2bB2c(b2bB2cParam) ? b2bB2cParam : undefined;
  const scoreMin = scoreMinParam && !Number.isNaN(Number(scoreMinParam)) ? Number(scoreMinParam) : undefined;

  const [{ rows, total, pageCount }, owners] = await Promise.all([
    listDeals({ q, status, b2bB2c, owner, scoreMin, page }),
    listOwners(),
  ]);

  const currentParams = {
    q,
    status: statusParam,
    b2bB2c: b2bB2cParam,
    owner,
    scoreMin: scoreMinParam,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Prospects</h1>

      <form className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-500">Recherche</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Entreprise, contact, email…"
            className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Statut</label>
          <select
            name="status"
            defaultValue={statusParam ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Tous</option>
            {DEAL_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {DEAL_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">B2B / B2C</label>
          <select
            name="b2bB2c"
            defaultValue={b2bB2cParam ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Tous</option>
            <option value="b2b">B2B</option>
            <option value="b2c">B2C</option>
            <option value="mixte">Mixte</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Owner</label>
          <select
            name="owner"
            defaultValue={owner ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Tous</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Score minimum</label>
          <input
            type="number"
            name="scoreMin"
            defaultValue={scoreMinParam ?? ""}
            placeholder="0"
            className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div className="flex items-end gap-2 lg:col-span-5">
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Filtrer
          </button>
          <Link href="/deals" className="rounded border border-zinc-300 px-4 py-1.5 text-sm dark:border-zinc-700">
            Réinitialiser
          </Link>
        </div>
      </form>

      <p className="mb-3 text-sm text-zinc-500">{total} résultat{total !== 1 ? "s" : ""}</p>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-2">Entreprise</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">B2B/B2C</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-2">
                  <Link href={`/deals/${row.id}`} className="font-medium hover:underline">
                    {row.companyName}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <div>{row.contactFullName ?? "—"}</div>
                  <div className="text-xs text-zinc-500">{row.contactEmail ?? ""}</div>
                </td>
                <td className="px-4 py-2">{row.status ? DEAL_STATUS_LABELS[row.status] : "—"}</td>
                <td className="px-4 py-2">{row.b2bB2c ?? "—"}</td>
                <td className="px-4 py-2">{row.owner ?? "—"}</td>
                <td className="px-4 py-2">{row.score ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-500">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Aucun résultat pour ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Page {page} / {pageCount} ({PAGE_SIZE} par page)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildHref(currentParams, page - 1)} className="rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700">
                Précédent
              </Link>
            )}
            {page < pageCount && (
              <Link href={buildHref(currentParams, page + 1)} className="rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700">
                Suivant
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
