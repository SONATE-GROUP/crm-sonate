import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
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
      <body className="min-h-full flex flex-col bg-sonate-cream text-sonate-green dark:bg-sonate-green dark:text-sonate-cream">
        <header className="border-b border-sonate-green/10 bg-sonate-cream dark:border-sonate-cream/10 dark:bg-sonate-green">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
            <Link href="/deals" className="flex flex-col leading-none">
              <span className="text-2xl font-extrabold tracking-tight">Sonate</span>
              <span className="text-[11px] font-medium text-sonate-muted">CRM interne</span>
            </Link>
            <nav className="text-sm font-semibold">
              <Link
                href="/deals"
                className="rounded-full px-3 py-1.5 hover:bg-sonate-green/5 dark:hover:bg-sonate-cream/10"
              >
                Prospects
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
