import Link from "next/link";

import { listContacts, PAGE_SIZE } from "@/lib/queries";
import { fieldClass, labelClass } from "@/lib/ui";
import { Pagination } from "@/components/Pagination";

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

  const { rows, total, pageCount } = await listContacts({ q, page });

  const currentParams = { q };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Contacts</h1>

      <form className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-sonate-green/10 bg-white p-4 dark:border-sonate-cream/10 dark:bg-sonate-green-light sm:grid-cols-3">
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
            className="rounded-full border border-sonate-green/20 px-5 py-2 text-sm font-semibold text-sonate-green dark:border-sonate-cream/30 dark:text-sonate-cream"
          >
            Réinitialiser
          </Link>
        </div>
      </form>

      <p className="mb-3 text-sm font-medium text-sonate-muted">
        {total} résultat{total !== 1 ? "s" : ""}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-sonate-green/10 bg-white dark:border-sonate-cream/10 dark:bg-sonate-green-light">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sonate-green/10 text-xs font-semibold uppercase tracking-wide text-sonate-muted dark:border-sonate-cream/10">
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
              <tr
                key={row.id}
                className="border-b border-sonate-green/5 last:border-0 hover:bg-sonate-orange/5 dark:border-sonate-cream/5 dark:hover:bg-sonate-cream/5"
              >
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
