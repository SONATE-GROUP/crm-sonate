import Link from "next/link";

import { B2B_B2C_VALUES, DEAL_STATUS_VALUES, type B2bB2c } from "@/db/schema";
import { listDealsForKanban, listOwners, getDealStats } from "@/lib/queries";
import { fieldClass, labelClass } from "@/lib/ui";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ViewToggle } from "@/components/ViewToggle";
import { KanbanBoard } from "@/components/KanbanBoard";

function isB2bB2c(value: string): value is B2bB2c {
  return (B2B_B2C_VALUES as readonly string[]).includes(value);
}

export default async function DealsKanbanPage({
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
  const owner = get("owner");
  const scoreMinParam = get("scoreMin");
  const dateFrom = get("dateFrom");
  const dateTo = get("dateTo");

  const b2bB2c = b2bB2cParam && isB2bB2c(b2bB2cParam) ? b2bB2cParam : undefined;
  const scoreMin = scoreMinParam && !Number.isNaN(Number(scoreMinParam)) ? Number(scoreMinParam) : undefined;

  const [deals, owners, stats] = await Promise.all([
    listDealsForKanban({ q, b2bB2c, owner, scoreMin, dateFrom, dateTo }),
    listOwners(),
    getDealStats(),
  ]);

  const withoutColumn = deals.filter(
    (d) => !d.status || !(DEAL_STATUS_VALUES as readonly string[]).includes(d.status)
  ).length;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <PageHeader
        title="Deals"
        actions={<ViewToggle active="kanban" kanbanHref="/deals" listHref="/deals/liste" />}
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

      <form className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-sonate-green/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
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
          <label className={labelClass}>B2B / B2C</label>
          <select name="b2bB2c" defaultValue={b2bB2cParam ?? ""} className={fieldClass}>
            <option value="">Tous</option>
            <option value="b2b">B2B</option>
            <option value="b2c">B2C</option>
            <option value="mixte">Mixte</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Responsable</label>
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
          <input type="number" name="scoreMin" defaultValue={scoreMinParam ?? ""} placeholder="0" className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Créé depuis le</label>
          <input type="date" name="dateFrom" defaultValue={dateFrom ?? ""} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Créé jusqu&apos;au</label>
          <input type="date" name="dateTo" defaultValue={dateTo ?? ""} className={fieldClass} />
        </div>
        <div className="flex items-end gap-2 lg:col-span-6">
          <button
            type="submit"
            className="rounded-full bg-sonate-orange px-5 py-2 text-sm font-semibold text-sonate-cream transition-colors hover:bg-sonate-orange-dark"
          >
            Filtrer
          </button>
          <Link
            href="/deals"
            className="rounded-full border border-sonate-green/20 px-5 py-2 text-sm font-semibold text-sonate-green"
          >
            Réinitialiser
          </Link>
        </div>
      </form>

      <p className="mb-3 text-sm font-medium text-sonate-muted">
        {deals.length} deal{deals.length !== 1 ? "s" : ""} · glisser-déposer une carte pour changer son statut
        {withoutColumn > 0 && (
          <>
            {" "}
            ·{" "}
            <Link href="/deals/liste" className="text-sonate-orange hover:underline">
              {withoutColumn} sans statut reconnu, non affiché{withoutColumn !== 1 ? "s" : ""} (voir la vue liste)
            </Link>
          </>
        )}
      </p>

      <KanbanBoard deals={deals} />
    </div>
  );
}
