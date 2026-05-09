import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse(
    `User-agent: *
Allow: /
Disallow: /api/
Disallow: /home
Disallow: /leads
Disallow: /jobs
Disallow: /quotes
Disallow: /estimates
Disallow: /invoices
Disallow: /profiles
Disallow: /properties
Disallow: /settings

Sitemap: https://renotrack360.com/sitemap.xml
`,
    { headers: { "Content-Type": "text/plain" } }
  );
}
