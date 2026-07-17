export function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-sonate-orange">{title}</h3>
      {children}
    </section>
  );
}

export function DrawerRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-sonate-green/5 py-2.5 last:border-0">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-sonate-muted">{label}</span>
      <span className="min-w-0 truncate text-sm font-medium text-sonate-green">{value ?? "—"}</span>
    </div>
  );
}
