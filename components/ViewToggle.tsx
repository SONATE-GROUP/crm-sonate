import Link from "next/link";

export function ViewToggle({ active, kanbanHref, listHref }: { active: "kanban" | "liste"; kanbanHref: string; listHref: string }) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold";
  const activeClass = "bg-sonate-orange text-sonate-cream";
  const inactiveClass = "text-sonate-muted hover:text-sonate-green";

  return (
    <div className="flex items-center gap-1 rounded-full border border-sonate-green/10 bg-white p-1">
      <Link href={kanbanHref} className={`${base} ${active === "kanban" ? activeClass : inactiveClass}`}>
        Kanban
      </Link>
      <Link href={listHref} className={`${base} ${active === "liste" ? activeClass : inactiveClass}`}>
        Liste
      </Link>
    </div>
  );
}
