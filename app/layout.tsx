import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { PostHogProvider } from "@/components/posthog-provider";

const CANONICAL_ORIGIN = "https://www.renotrack360.com";

export const metadata: Metadata = {
  title: {
    default: "RenoTrack360 — Renovation Operations Command Center",
    template: "%s — RenoTrack360"
  },
  description: "Lead-to-closeout renovation operating system for residential contractors. Estimates, change orders, invoices, client portal, and profit dashboard — all in one place.",
  metadataBase: new URL(CANONICAL_ORIGIN),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "RenoTrack360",
    url: CANONICAL_ORIGIN,
    title: "RenoTrack360 — Renovation Operations Command Center",
    description: "Lead-to-closeout renovation operating system for residential contractors."
  },
  twitter: {
    card: "summary_large_image",
    title: "RenoTrack360 — Renovation Operations Command Center",
    description: "Lead-to-closeout renovation operating system for residential contractors."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true }
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <SessionProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
