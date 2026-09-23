import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, staffApiDenial } from "@/lib/staff-access";
import { buildCompanyExport } from "@/lib/company-export";

export const dynamic = "force-dynamic";

/**
 * Self-service download of the company's own records.
 *
 * Any active management member may take a copy of what the company has in RenoTrack360, without
 * asking the operator. The payload is scoped by membership-derived company, and the download is
 * recorded as an audit event so a copy leaving the platform is itself visible in the record.
 */
export async function GET() {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const actor = await requireStaff();

  const payload = await buildCompanyExport(prisma, actor.organizationId);
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = payload.organization.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "company";

  await prisma.auditEvent.create({
    data: {
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: "COMPANY_DATA_EXPORTED",
      entityType: "Organization",
      entityId: actor.organizationId,
      metadata: { formatVersion: payload.manifest.formatVersion, counts: payload.manifest.counts },
    },
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-renotrack360-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
