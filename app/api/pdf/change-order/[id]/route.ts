import { NextResponse } from "next/server";
import { buildDocument } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.changeOrder.findUniqueOrThrow({
    where: { id },
    include: { clientProfile: true, job: { include: { property: true, organization: true } } }
  });
  const org = order.job.organization;
  const pdf = await buildDocument({
    title: "Change Order",
    number: order.changeOrderTitle,
    client: order.clientProfile?.profileName,
    property: order.job.property?.propertyAddress,
    sections: [
      { heading: "Reason", body: order.reason },
      { heading: "Field condition", body: order.fieldCondition },
      { heading: "Approval notes", body: order.signatureApprovalNotes }
    ],
    totals: [
      { label: "Added cost", value: Number(order.addedCost) },
      { label: "Added days", value: Number(order.addedTime) }
    ],
    terms: "Client approval is required before changed scope is scheduled or billed.",
    brand: {
      companyName: org.name,
      tagline: org.companyTagline,
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
      "Content-Disposition": `attachment; filename="change-order.pdf"`
    }
  });
}
