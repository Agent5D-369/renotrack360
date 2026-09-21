
import { staffApiDenial } from "@/lib/staff-access";
import { NextResponse } from "next/server";
import { buildDocument } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const { id } = await params;
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id },
    include: { clientProfile: true, job: { include: { property: true, organization: true } } }
  });
  const org = invoice.job?.organization ?? await prisma.organization.findFirstOrThrow();
  const pdf = await buildDocument({
    title: "Invoice",
    number: invoice.invoiceNumber,
    client: invoice.clientProfile?.profileName,
    property: invoice.job?.property?.propertyAddress,
    sections: [{ heading: "Invoice notes", body: invoice.notes ?? "Renovation services per approved scope." }],
    totals: [
      { label: "Subtotal", value: Number(invoice.subtotal) },
      { label: "Tax", value: Number(invoice.tax) },
      { label: "Total", value: Number(invoice.total) },
      { label: "Paid", value: Number(invoice.amountPaid) },
      { label: "Balance due", value: Number(invoice.balanceDue) }
    ],
    terms: org.invoiceTerms,
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
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`
    }
  });
}
