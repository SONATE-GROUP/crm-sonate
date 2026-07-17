export function PageHeader({ title, meta }: { title: string; meta?: { label: string; value: string } }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {meta && (
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-sonate-muted">{meta.label}</div>
          <div className="text-sm font-semibold text-sonate-green">{meta.value}</div>
        </div>
      )}
    </div>
  );
}
