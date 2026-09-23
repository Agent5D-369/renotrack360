import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated liveness and readiness probe for the deploy platform and any uptime monitor.
 *
 * It answers two questions and nothing else: is the process serving, and can it reach its database.
 * It never returns row counts, configuration, credentials or customer data, and it never writes.
 * A database it cannot reach is reported as degraded with a 503 so a monitor can tell "up but
 * unable to serve" apart from "up".
 */
export async function GET() {
  const checkedAt = new Date().toISOString();
  let database: "ok" | "unreachable" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unreachable";
  }
  return NextResponse.json(
    {
      status: database === "ok" ? "ok" : "degraded",
      database,
      release: process.env.SABERRA_RELEASE ?? null,
      checkedAt,
    },
    { status: database === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
