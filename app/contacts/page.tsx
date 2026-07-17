import Link from "next/link";

import { listContacts, getContactStats, PAGE_SIZE } from "@/lib/queries";
import { fieldClass, labelClass } from "@/lib/ui";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

export default async function ContactsPage({
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
  const page = Number(get("page") ?? "1") || 1;

  const [{ rows, total, pageCount }, stats] = await Promise.all([listContacts({ q, page }), getContactStats()]);

  const currentParams = { q };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Contacts"
        meta={
          stats.lastImport
            ? { label: "Dernier import", value: stats.lastImport.toLocaleDateString("fr-FR") }
            : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Contacts" value={stats.total} />
        <StatCard label="Avec email" value={stats.withEmail} tone="orange" />
        <StatCard label="Avec téléphone" value={stats.withPhone} />
      </div>

      <form className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-sonate-green/10 bg-white p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={labelClass}>Recherche</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nom, email, téléphone, entreprise…"
            className={fieldClass}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark"
          >
            Filtrer
          </button>
          <Link
            href="/contacts"
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
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Entreprise</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-sonate-green/5 last:border-0 hover:bg-sonate-orange/5">
                <td className="px-4 py-3 font-semibold">{row.fullName}</td>
                <td className="px-4 py-3">{row.email ?? "—"}</td>
                <td className="px-4 py-3">{row.phone ?? "—"}</td>
                <td className="px-4 py-3">{row.role ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/companies/${row.companyId}`} className="text-sonate-orange hover:underline">
                    {row.companyName}
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sonate-muted">
                  Aucun résultat pour cette recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/contacts" params={currentParams} page={page} pageCount={pageCount} pageSize={PAGE_SIZE} />
    </div>
  );
}
