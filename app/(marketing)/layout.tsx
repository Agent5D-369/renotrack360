import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.renotrack360.com"),
  robots: { index: false, follow: false },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Fraunces for display headlines, Inter for body */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>{children}</div>
    </>
  );
}
