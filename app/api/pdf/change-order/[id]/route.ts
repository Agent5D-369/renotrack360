
import { staffApiDenial } from "@/lib/staff-access";
import { NextResponse } from "next/server";
import { buildDocument } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { changeOrderContent, changeContentSchema } from "@/lib/change-order-ledger";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const { id } = await params;
  const order = await prisma.changeOrder.findFirstOrThrow({
    where: { id, job: { organizationId: DEFAULT_ORG_ID } },
    include: { appliedChange: { include: { snapshot: true } }, clientProfile: true, job: { include: { property: true, organization: true } } }
  });
  const org = order.job.organization;
  const retained = order.appliedChange?.snapshot;
  const content = retained ? changeContentSchema.parse(retained.content) : changeOrderContent(order);
  const pdf = await buildDocument({
    title: retained ? "Approved Change Order" : "Change Order - Recorded Draft / History",
    number: content.changeOrderTitle,
    client: order.clientProfile?.profileName,
    property: order.job.property?.propertyAddress,
    sections: [
      { heading: "Reviewed scope and reason", body: content.reason },
      { heading: "Schedule", body: "Added time: " + content.addedTime + " days. " + content.scheduleNote },
      { heading: "Record status", body: retained ? "Retained client-approved version. Approved by " + order.appliedChange!.signerName + " on " + order.appliedChange!.createdAt.toISOString().slice(0, 10) : "No versioned client approval is attached to this export. This document does not authorize work." }
    ],
    totals: [
      { label: "Contract price change", value: Number(content.addedCost) }
    ],
    terms: "Client approval is required before changed scope is scheduled or billed.",
    brand: {
      companyName: org.name,
      tagline: org.companyTagline,
      logoUrl: org.logoUrl,
      color: org.brandColor,
      address: org.address,
      phone: org.phone,
      email: org.email,
      website: org.website
    }
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="change-order.pdf"`
    }
  });
}
