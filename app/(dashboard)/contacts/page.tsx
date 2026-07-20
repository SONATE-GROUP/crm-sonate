import Link from "next/link";

import { listContacts, getContactStats, PAGE_SIZE } from "@/lib/queries";
import { fieldClass, labelClass } from "@/lib/ui";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ContactsTable } from "@/components/ContactsTable";

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
            ? { label: "Dernier import", value: new Date(stats.lastImport).toLocaleDateString("fr-FR") }
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

      <ContactsTable rows={rows} />

      <Pagination basePath="/contacts" params={currentParams} page={page} pageCount={pageCount} pageSize={PAGE_SIZE} />
    </div>
  );
}
