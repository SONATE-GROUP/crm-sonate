"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/companies", label: "Entreprises" },
  { href: "/contacts", label: "Contacts" },
  { href: "/deals", label: "Deals" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 text-sm font-semibold">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-full bg-sonate-orange px-3 py-1.5 text-sonate-cream"
                : "rounded-full px-3 py-1.5 hover:bg-sonate-green/5 dark:hover:bg-sonate-cream/10"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
