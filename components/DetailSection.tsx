export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-sonate-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-sonate-green dark:text-sonate-cream">{value ?? "—"}</dd>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-sonate-green/10 bg-white p-5 dark:border-sonate-cream/10 dark:bg-sonate-green-light">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-sonate-orange">{title}</h2>
      {children}
    </section>
  );
}
