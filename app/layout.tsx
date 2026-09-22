import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { PostHogProvider } from "@/components/posthog-provider";

const CANONICAL_ORIGIN = "https://www.renotrack360.com";

export const metadata: Metadata = {
  title: {
    default: "RenoTrack360 | Renovation Operations",
    template: "%s | RenoTrack360"
  },
  description: "RenoTrack360 renovation operations. Flipside Renovations is the first rollout.",
  metadataBase: new URL(CANONICAL_ORIGIN),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "RenoTrack360",
    url: CANONICAL_ORIGIN,
    title: "RenoTrack360 | Renovation Operations",
    description: "RenoTrack360 renovation operations. Flipside Renovations is the first rollout."
  },
  twitter: {
    card: "summary_large_image",
    title: "RenoTrack360 | Renovation Operations",
    description: "RenoTrack360 renovation operations. Flipside Renovations is the first rollout."
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

