/** Demo resets are restricted to explicitly named, loopback-only disposable databases. */
export function assertDisposableDemoDatabase(env: Readonly<Record<string, string | undefined>> = process.env): void {
  if (env.NODE_ENV === "production" || env.RAILWAY_ENVIRONMENT_ID || env.RAILWAY_PROJECT_ID) {
    throw new Error("Demo seeding is disabled in production and Railway environments.");
  }
  if (env.FLIPSIDE_DATABASE_PURPOSE !== "disposable-demo") {
    throw new Error("Demo seeding requires FLIPSIDE_DATABASE_PURPOSE=disposable-demo.");
  }
  let url: URL;
  try { url = new URL(env.DATABASE_URL ?? ""); }
  catch { throw new Error("Demo seeding requires an explicit disposable database URL."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)
      || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      || !/^\/flipside_demo_[a-z0-9_]+$/.test(url.pathname)
      || url.searchParams.has("host") || url.searchParams.has("hostaddr")) {
    throw new Error("Demo seeding requires a loopback PostgreSQL database named flipside_demo_<name>.");
  }
}
