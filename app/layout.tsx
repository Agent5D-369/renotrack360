import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { PostHogProvider } from "@/components/posthog-provider";

export const metadata: Metadata = {
  title: "RenoTrack360 Command Center",
  description: "Renovation operations from lead to closeout."
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
