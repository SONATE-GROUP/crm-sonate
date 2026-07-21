"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronsUpDown } from "lucide-react";

import { setActiveWorkspace } from "@/lib/workspace-session-actions";

type WorkspaceOption = { id: number; name: string };

export function WorkspaceSwitcher({
  activeName,
  options,
}: {
  activeName: string | null;
  options: WorkspaceOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSelect(workspaceId: number) {
    setOpen(false);
    startTransition(async () => {
      await setActiveWorkspace(workspaceId, pathname);
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative mx-3 mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex w-full items-center justify-between gap-2 rounded-xl bg-sonate-cream/10 px-3 py-2.5 text-sm font-semibold text-sonate-cream hover:bg-sonate-cream/15 disabled:opacity-60"
      >
        <span className="truncate">{activeName ?? "Choisir un espace"}</span>
        <ChevronsUpDown size={15} strokeWidth={2} className="shrink-0 text-sonate-cream/60" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-xl border border-sonate-cream/10 bg-sonate-green py-1 shadow-lg">
          {options.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => handleSelect(w.id)}
              className={
                w.name === activeName
                  ? "block w-full truncate px-3 py-2 text-left text-sm font-semibold text-sonate-orange"
                  : "block w-full truncate px-3 py-2 text-left text-sm text-sonate-cream/80 hover:bg-sonate-cream/10 hover:text-sonate-cream"
              }
            >
              {w.name}
            </button>
          ))}
          {options.length === 0 && <p className="px-3 py-2 text-sm text-sonate-cream/50">Aucun espace disponible.</p>}
        </div>
      )}
    </div>
  );
}
