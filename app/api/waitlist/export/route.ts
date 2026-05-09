import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.waitlistEntry.findMany({ orderBy: { createdAt: "asc" } });

  const rows = [
    ["Position", "Email", "First Name", "Plan Interest", "Leak Total", "UTM Source", "UTM Campaign", "Referral Code", "Joined"].join(","),
    ...entries.map((e, i) =>
      [
        i + 1,
        e.email,
        e.firstName || "",
        e.planInterest || "",
        e.calcLeakTotal ? Math.round(e.calcLeakTotal) : "",
        e.utmSource || "",
        e.utmCampaign || "",
        e.referralCode || "",
        e.createdAt.toISOString().slice(0, 10),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
