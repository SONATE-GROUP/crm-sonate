"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";

export function Drawer({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const close = () => router.back();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-sonate-green/40" onClick={close} />
      <div className="animate-drawer-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-sonate-cream shadow-2xl">
        <div className="flex items-start justify-between gap-4 bg-sonate-green px-6 py-5 text-sonate-cream">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-sonate-cream/70">{subtitle}</p>}
          </div>
          <button
            onClick={close}
            aria-label="Fermer"
            className="shrink-0 rounded-full p-1.5 text-sonate-cream/80 hover:bg-sonate-cream/10 hover:text-sonate-cream"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
