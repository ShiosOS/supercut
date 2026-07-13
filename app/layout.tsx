// Root layout: shared shell and metadata for the three app pages.

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supercut",
  description:
    "Type a market, get a playbook of what's working in its paid social video ads. AI watches each ad, code counts the patterns, every claim comes with receipts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {/* Fixed header height so full-page views can size against it. */}
        <header className="h-14 border-b border-stone-200 bg-white">
          <div className="flex h-full items-center gap-3 px-6">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Supercut
            </Link>
            <span className="text-sm text-stone-500">
              what&apos;s working in your market&apos;s ads, with receipts
            </span>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
