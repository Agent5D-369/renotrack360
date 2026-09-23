import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";
import { saasSalesEnabled } from "@/lib/flipside-brand";

const softwareSalesPaths = ["/", "/pricing", "/profit-leak"];

// 301 redirect bare apex domain → www canonical
// Handles the case if the root domain ever resolves to Railway in future
function apexRedirect(req: NextRequest): NextResponse | null {
  const host = req.headers.get("host") ?? "";
  // Match bare renotrack360.com (with or without port) but not www
  if (/^renotrack360\.com(:\d+)?$/.test(host)) {
    const url = req.nextUrl.clone();
    url.host = "www.renotrack360.com";
    url.port = "";
    return NextResponse.redirect(url, { status: 301, headers: { "Cache-Control": "public, max-age=31536000" } });
  }
  return null;
}

// Combine apex redirect with NextAuth middleware
export default withAuth(
  function middleware(req) {
    const redirect = apexRedirect(req);
    if (redirect) return redirect;
    if (!saasSalesEnabled() && softwareSalesPaths.includes(req.nextUrl.pathname)) return NextResponse.redirect(new URL(req.nextauth.token ? "/home" : "/login", req.url));
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => (!saasSalesEnabled() && softwareSalesPaths.includes(req.nextUrl.pathname)) || !!token
    }
  }
);

export const config = {
  matcher: [
    "/", "/pricing", "/profit-leak",
    "/((?!brand/|api/auth|api/health|api/invite/accept|api/waitlist|api/waitlist/stats|api/waitlist/export|api/approve|api/review|api/portal|api/stripe/webhook|api/internal/reset-demo|login|pricing|profit-leak|portal|approve|review|forgot-password|reset-password|accept-invite|privacy|terms|_next/static|_next/image|robots\\.txt|llms\\.txt|sitemap\\.xml|favicon\\.ico)(?!$).+)"
  ]
};

