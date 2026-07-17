import Link from "next/link";

import { buildHref } from "@/lib/ui";

export function Pagination({
  basePath,
  params,
  page,
  pageCount,
  pageSize,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  pageSize: number;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-sonate-muted">
        Page {page} / {pageCount} ({pageSize} par page)
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildHref(basePath, params, page - 1)}
            className="rounded-full border border-sonate-green/20 px-4 py-1.5 font-medium"
          >
            Précédent
          </Link>
        )}
        {page < pageCount && (
          <Link
            href={buildHref(basePath, params, page + 1)}
            className="rounded-full border border-sonate-green/20 px-4 py-1.5 font-medium"
          >
            Suivant
          </Link>
        )}
      </div>
    </div>
  );
}
