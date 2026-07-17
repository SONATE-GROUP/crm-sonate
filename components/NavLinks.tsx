"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, Handshake } from "lucide-react";

const LINKS = [
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/deals", label: "Deals", icon: Handshake },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "flex items-center gap-2.5 rounded-xl bg-sonate-orange px-3 py-2.5 text-sm font-semibold text-sonate-cream"
                : "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sonate-cream/70 hover:bg-sonate-cream/10 hover:text-sonate-cream"
            }
          >
            <Icon size={17} strokeWidth={2} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
