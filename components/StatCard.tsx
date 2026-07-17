export function StatCard({ label, value, tone = "default" }: { label: string; value: React.ReactNode; tone?: "default" | "orange" }) {
  return (
    <div className="rounded-2xl border border-sonate-green/10 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-sonate-muted">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tone === "orange" ? "text-sonate-orange" : "text-sonate-green"}`}>
        {value}
      </div>
    </div>
  );
}
