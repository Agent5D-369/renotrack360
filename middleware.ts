export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!api/auth|api/waitlist|api/waitlist/stats|api/waitlist/export|api/approve|api/review|api/portal|api/stripe/webhook|api/internal/reset-demo|login|pricing|profit-leak|portal|approve|review|forgot-password|reset-password|accept-invite|_next/static|_next/image|robots\\.txt|llms\\.txt|favicon\\.ico)(?!$).+)"
  ]
};
