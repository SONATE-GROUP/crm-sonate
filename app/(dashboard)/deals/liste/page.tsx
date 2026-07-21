import Link from "next/link";
import { redirect } from "next/navigation";

import { B2B_B2C_VALUES, DEAL_STATUS_LABELS, DEAL_STATUS_VALUES, type B2bB2c, type DealStatus } from "@/db/schema";
import { listDeals, listOwners, getDealStats, PAGE_SIZE } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { fieldClass, labelClass } from "@/lib/ui";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ViewToggle } from "@/components/ViewToggle";

function isDealStatus(value: string): value is DealStatus {
  return (DEAL_STATUS_VALUES as readonly string[]).includes(value);
}

function isB2bB2c(value: string): value is B2bB2c {
  return (B2B_B2C_VALUES as readonly string[]).includes(value);
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = { isAdmin: user.isAdmin, workspaceIds: user.workspaceIds };

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
  const dateFrom = get("dateFrom");
  const dateTo = get("dateTo");
  const page = Number(get("page") ?? "1") || 1;

  const status = statusParam && isDealStatus(statusParam) ? statusParam : undefined;
  const b2bB2c = b2bB2cParam && isB2bB2c(b2bB2cParam) ? b2bB2cParam : undefined;
  const scoreMin = scoreMinParam && !Number.isNaN(Number(scoreMinParam)) ? Number(scoreMinParam) : undefined;

  const [{ rows, total, pageCount }, owners, stats] = await Promise.all([
    listDeals({ q, status, b2bB2c, owner, scoreMin, dateFrom, dateTo, page, scope }),
    listOwners(scope),
    getDealStats(scope),
  ]);

  const currentParams = {
    q,
    status: statusParam,
    b2bB2c: b2bB2cParam,
    owner,
    scoreMin: scoreMinParam,
    dateFrom,
    dateTo,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Deals"
        actions={<ViewToggle active="liste" kanbanHref="/deals" listHref="/deals/liste" />}
        meta={
          stats.lastImport
            ? { label: "Dernier import", value: new Date(stats.lastImport).toLocaleDateString("fr-FR") }
            : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Deals" value={stats.total} />
        <StatCard label="Gagnés" value={stats.gagne} />
        <StatCard label="Perdus" value={stats.perdu} />
        <StatCard label="Score moyen" value={stats.avgScore ?? "—"} tone="orange" />
      </div>

      <form className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-sonate-green/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className={labelClass}>Recherche</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Entreprise, contact, email…"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Statut</label>
          <select name="status" defaultValue={statusParam ?? ""} className={fieldClass}>
            <option value="">Tous</option>
            {DEAL_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {DEAL_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>B2B / B2C</label>
          <select name="b2bB2c" defaultValue={b2bB2cParam ?? ""} className={fieldClass}>
            <option value="">Tous</option>
            <option value="b2b">B2B</option>
            <option value="b2c">B2C</option>
            <option value="mixte">Mixte</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Owner</label>
          <select name="owner" defaultValue={owner ?? ""} className={fieldClass}>
            <option value="">Tous</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Score minimum</label>
          <input
            type="number"
            name="scoreMin"
            defaultValue={scoreMinParam ?? ""}
            placeholder="0"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Créé depuis le</label>
          <input type="date" name="dateFrom" defaultValue={dateFrom ?? ""} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Créé jusqu&apos;au</label>
          <input type="date" name="dateTo" defaultValue={dateTo ?? ""} className={fieldClass} />
        </div>
        <div className="flex items-end gap-2 lg:col-span-5">
          <button
            type="submit"
            className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark"
          >
            Filtrer
          </button>
          <Link
            href="/deals/liste"
            className="rounded-full border border-sonate-green/20 px-5 py-2 text-sm font-semibold text-sonate-green"
          >
            Réinitialiser
          </Link>
        </div>
      </form>

      <p className="mb-3 text-sm font-medium text-sonate-muted">
        {total} résultat{total !== 1 ? "s" : ""}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sonate-green/10 bg-sonate-green/5 text-xs font-semibold uppercase tracking-wide text-sonate-muted">
            <tr>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">B2B/B2C</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-sonate-green/5 last:border-0 hover:bg-sonate-orange/5">
                <td className="px-4 py-3">
                  <Link href={`/deals/${row.id}`} className="font-semibold hover:text-sonate-orange">
                    {row.companyName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div>{row.contactFullName ?? "—"}</div>
                  <div className="text-xs text-sonate-muted">{row.contactEmail ?? ""}</div>
                </td>
                <td className="px-4 py-3">{row.status ? <StatusBadge status={row.status} /> : "—"}</td>
                <td className="px-4 py-3">{row.b2bB2c ?? "—"}</td>
                <td className="px-4 py-3">{row.owner ?? "—"}</td>
                <td className="px-4 py-3 font-bold text-sonate-orange">{row.score ?? "—"}</td>
                <td className="px-4 py-3 text-sonate-muted">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sonate-muted">
                  Aucun résultat pour ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/deals/liste" params={currentParams} page={page} pageCount={pageCount} pageSize={PAGE_SIZE} />
    </div>
  );
}
