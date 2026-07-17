import { AlertTriangle } from "lucide-react";

export function PendingBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-sonate-orange/15 px-2 py-0.5 text-xs font-semibold text-sonate-orange-dark">
      <AlertTriangle size={12} />
      {count} en attente
    </span>
  );
}
