import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM Sonate",
  description: "CRM interne Sonate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full bg-sonate-cream text-sonate-green">
        <aside className="flex w-64 shrink-0 flex-col bg-sonate-green text-sonate-cream">
          <Link href="/companies" className="flex flex-col px-6 py-6 leading-none">
            <span className="text-2xl font-extrabold tracking-tight">Sonate</span>
            <span className="mt-0.5 text-[11px] font-medium text-sonate-cream/60">CRM interne</span>
          </Link>
          <div className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-wide text-sonate-cream/40">
            Pipeline
          </div>
          <NavLinks />
        </aside>
        <div className="min-w-0 flex-1">
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
