export { default } from "next-auth/middleware";

export const config = {
  // Protect workspace routes. Public: /, /pricing, /api/waitlist, auth, static assets.
  // Public: /, /pricing, /profit-leak, /portal/*, /approve/*, /review/*, /api/waitlist, /api/approve/*, /api/review/*, auth, static
  matcher: ["/((?!api/auth|api/waitlist|api/approve|api/review|api/portal|login|pricing|profit-leak|portal|approve|review|_next/static|_next/image|robots\\.txt|llms\\.txt|favicon\\.ico)(?!$).+)"],
};
