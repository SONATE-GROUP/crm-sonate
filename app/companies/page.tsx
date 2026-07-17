import Link from "next/link";

import { B2B_B2C_VALUES, SOURCE_SYSTEM_VALUES, type B2bB2c, type SourceSystem } from "@/db/schema";
import { listCompanies, getCompanyStats, PAGE_SIZE } from "@/lib/queries";
import { fieldClass, labelClass } from "@/lib/ui";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

function isB2bB2c(value: string): value is B2bB2c {
  return (B2B_B2C_VALUES as readonly string[]).includes(value);
}

function isSourceSystem(value: string): value is SourceSystem {
  return (SOURCE_SYSTEM_VALUES as readonly string[]).includes(value);
}

export default async function CompaniesPage({
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
  const b2bB2cParam = get("b2bB2c");
  const sourceSystemParam = get("sourceSystem");
  const page = Number(get("page") ?? "1") || 1;

  const b2bB2c = b2bB2cParam && isB2bB2c(b2bB2cParam) ? b2bB2cParam : undefined;
  const sourceSystem = sourceSystemParam && isSourceSystem(sourceSystemParam) ? sourceSystemParam : undefined;

  const [{ rows, total, pageCount }, stats] = await Promise.all([
    listCompanies({ q, b2bB2c, sourceSystem, page }),
    getCompanyStats(),
  ]);

  const currentParams = { q, b2bB2c: b2bB2cParam, sourceSystem: sourceSystemParam };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Entreprises"
        meta={
          stats.lastImport
            ? { label: "Dernier import", value: new Date(stats.lastImport).toLocaleDateString("fr-FR") }
            : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Entreprises" value={stats.total} />
        <StatCard label="Contacts" value={stats.totalContacts} />
        <StatCard label="B2B" value={stats.b2b} tone="orange" />
        <StatCard label="B2C" value={stats.b2c} tone="orange" />
      </div>

      <form className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-sonate-green/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className={labelClass}>Recherche</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nom, site web, secteur…"
            className={fieldClass}
          />
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
          <label className={labelClass}>Source système</label>
          <select name="sourceSystem" defaultValue={sourceSystemParam ?? ""} className={fieldClass}>
            <option value="">Toutes</option>
            {SOURCE_SYSTEM_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark"
          >
            Filtrer
          </button>
          <Link
            href="/companies"
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
                  <Link href={`/companies/${row.id}`} className="font-semibold hover:text-sonate-orange">
                    {row.name}
                  </Link>
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
                <td colSpan={7} className="px-4 py-8 text-center text-sonate-muted">
                  Aucun résultat pour ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/companies" params={currentParams} page={page} pageCount={pageCount} pageSize={PAGE_SIZE} />
    </div>
  );
}
