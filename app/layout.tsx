import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { PostHogProvider } from "@/components/posthog-provider";

const CANONICAL_ORIGIN = "https://www.renotrack360.com";

export const metadata: Metadata = {
  title: {
    default: "Flipside Renovations | Command Center",
    template: "%s | Flipside Renovations"
  },
  description: "Private project operations for Flipside Renovations in Austin.",
  metadataBase: new URL(CANONICAL_ORIGIN),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Flipside Renovations",
    url: CANONICAL_ORIGIN,
    title: "Flipside Renovations | Command Center",
    description: "Private project operations for Flipside Renovations in Austin."
  },
  twitter: {
    card: "summary_large_image",
    title: "Flipside Renovations | Command Center",
    description: "Private project operations for Flipside Renovations in Austin."
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false }
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

