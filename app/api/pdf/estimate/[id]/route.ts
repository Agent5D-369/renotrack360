
import { staffApiDenial } from "@/lib/staff-access";
import { NextResponse } from "next/server";
import { buildDocument } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const { id } = await params;
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id },
    include: { clientProfile: true, property: true, lineItems: true, organization: true }
  });
  const org = quote.organization;
  const pdf = await buildDocument({
    title: "Renovation Estimate",
    number: quote.quoteName,
    client: quote.clientProfile?.profileName,
    property: quote.property?.propertyAddress,
    sections: [
      {
        heading: "Scope line items",
        lines: quote.lineItems.map((item) => ({
          name: item.lineItemName,
          description: item.clientFacingDescription,
          quantity: Number(item.quantity),
          total: Number(item.totalTarget)
        }))
      },
      { heading: "Notes", body: quote.notes }
    ],
    totals: [
      { label: "Low planning range", value: Number(quote.totalLow) },
      { label: "Target estimate", value: Number(quote.totalTarget) },
      { label: "High planning range", value: Number(quote.totalHigh) },
      { label: "Final quote amount", value: Number(quote.finalQuoteAmount ?? quote.totalTarget) }
    ],
    terms: org.estimateTerms,
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
      "Content-Disposition": `attachment; filename="${quote.quoteName.replaceAll(" ", "-")}.pdf"`
    }
  });
}
