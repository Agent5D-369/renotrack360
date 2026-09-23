import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, staffApiDenial } from "@/lib/staff-access";
import { buildCompanyExport, resourceToCsv, EXPORTABLE_RESOURCES } from "@/lib/company-export";

export const dynamic = "force-dynamic";

/**
 * Self-service download of the company's own records.
 *
 * Three shapes, all scoped by membership-derived company and all recorded as an audit event so a
 * copy leaving the platform is itself visible:
 *   /api/export                                  the whole company as JSON
 *   /api/export?resource=invoices                one resource as JSON
 *   /api/export?resource=invoices&format=csv     one resource as CSV for a spreadsheet
 *
 * Any active management member may take a copy of what the company has, without asking the operator.
 */
export async function GET(request: Request) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const actor = await requireStaff();

  const url = new URL(request.url);
  const requested = url.searchParams.get("resource");
  const format = (url.searchParams.get("format") ?? "json").toLowerCase() === "csv" ? "csv" : "json";

  if (format === "csv" && !requested) {
    return NextResponse.json({ error: "Choose a resource to download as CSV." }, { status: 400 });
  }
  if (requested && !(EXPORTABLE_RESOURCES as readonly string[]).includes(requested)) {
    return NextResponse.json({ error: "Unknown resource." }, { status: 404 });
  }

  const payload = await buildCompanyExport(prisma, actor.organizationId);
  const rows = requested ? (payload.resources as unknown as Record<string, Record<string, unknown>[]>)[requested] : null;
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = payload.organization.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "company";

  await prisma.auditEvent.create({
    data: {
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: "COMPANY_DATA_EXPORTED",
      entityType: "Organization",
      entityId: actor.organizationId,
      metadata: {
        formatVersion: payload.manifest.formatVersion,
        shape: requested ? `${requested}.${format}` : "all.json",
        counts: requested ? { [requested]: rows?.length ?? 0 } : payload.manifest.counts,
      },
    },
  });

  if (requested && format === "csv") {
    return new NextResponse(resourceToCsv(rows ?? []), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-${requested}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(JSON.stringify(requested ? rows : payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-${requested ?? "renotrack360-export"}-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
