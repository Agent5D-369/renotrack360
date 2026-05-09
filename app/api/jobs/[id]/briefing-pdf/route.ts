import { NextRequest, NextResponse } from "next/server";
import { buildDocument } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await req.formData();

    const get = (key: string) => String(form.get(key) ?? "").trim();

    const job = await prisma.job.findUniqueOrThrow({
      where: { id },
      include: { clientProfile: true, property: true, organization: true },
    });
    const org = job.organization;

    const pdf = await buildDocument({
      title: "Pre-Construction Client Briefing",
      number: job.jobName,
      client: job.clientProfile?.profileName,
      property: job.property?.propertyAddress,
      sections: [
        { heading: "Scope of work", body: get("scopeSummary") || "See attached contract for full scope." },
        { heading: "Exclusions", body: get("exclusions") || "No additional exclusions noted beyond the signed contract." },
        { heading: "Allowances", body: get("allowances") || "All allowance amounts are specified in the signed estimate." },
        { heading: "Client responsibilities", body: get("clientResponsibilities") || "Client agrees to provide clear access, timely selections decisions, and payment per the schedule below." },
        { heading: "Payment schedule", body: get("paymentSchedule") || "Per invoice schedule on file." },
        { heading: "Warranty and care", body: get("warrantyNotes") || "Standard workmanship warranty applies. Contact us immediately for warranty claims." },
      ],
      terms: "This briefing document summarizes the pre-construction agreement. It supplements but does not replace the signed contract. Any changes to scope require a written change order.",
      brand: {
        companyName: org.name,
        tagline: org.companyTagline,
        color: org.brandColor,
        address: org.address,
        phone: org.phone,
        email: org.email,
        website: org.website,
      },
    });

    const slug = job.jobName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="briefing-${slug}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Briefing PDF error", err);
    return NextResponse.json({ error: "Briefing PDF generation failed" }, { status: 500 });
  }
}
