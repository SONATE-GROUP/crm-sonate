export const fieldClass =
  "w-full rounded-xl border border-sonate-green/15 bg-white px-3 py-1.5 text-sm text-sonate-green outline-none focus:border-sonate-orange dark:border-sonate-cream/15 dark:bg-sonate-green-light dark:text-sonate-cream";
export const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-sonate-muted";

export function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
