
import { requireStaff, staffApiDenial } from "@/lib/staff-access";
import { invoiceInOrganization } from "@/lib/delivery-scope";
import { NextResponse } from "next/server";
import { buildDocument } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const actor = await requireStaff();
  const { id } = await params;
  // Company isolation: this route previously read any invoice id and branded it with an arbitrary
  // organization, so one company could export another company's invoice.
  const invoice = await prisma.invoice.findFirst({
    where: invoiceInOrganization(actor.organizationId, { id }),
    include: { clientProfile: { include: { organization: true } }, job: { include: { property: true, organization: true } } }
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const org = invoice.job?.organization ?? invoice.clientProfile?.organization
    ?? await prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
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
