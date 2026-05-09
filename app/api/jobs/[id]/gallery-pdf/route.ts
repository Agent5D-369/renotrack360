import { NextResponse } from "next/server";
import { buildDocument } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUniqueOrThrow({
      where: { id },
      include: {
        jobPhotos: { orderBy: [{ label: "asc" }, { takenAt: "asc" }] },
        clientProfile: true,
        property: true,
        organization: true,
      },
    });

    const org = job.organization;
    const before = job.jobPhotos.filter((p) => p.label === "BEFORE");
    const during = job.jobPhotos.filter((p) => p.label === "DURING");
    const after = job.jobPhotos.filter((p) => p.label === "AFTER");

    // Limit images per section for performance (top 6 each)
    const cap = (arr: typeof before) => arr.slice(0, 6).map((p) => ({ url: p.url, caption: p.caption ?? p.phase ?? null }));

    const imageGroups = [
      ...(before.length ? [{ heading: "Before", images: cap(before) }] : []),
      ...(during.length ? [{ heading: "During Construction", images: cap(during) }] : []),
      ...(after.length ? [{ heading: "After - Completed Work", images: cap(after) }] : []),
    ];

    const pdf = await buildDocument({
      title: "Project Photo Gallery",
      number: job.jobName,
      client: job.clientProfile?.profileName,
      property: job.property?.propertyAddress,
      sections: [
        {
          heading: "Photo summary",
          body: `${before.length} before · ${during.length} during construction · ${after.length} after completion`,
        },
      ],
      imageGroups,
      terms: `Photos captured throughout ${job.jobName}. All work completed by ${org.name}.`,
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
        "Content-Disposition": `attachment; filename="gallery-${slug}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Gallery PDF error", err);
    return NextResponse.json({ error: "Gallery PDF generation failed" }, { status: 500 });
  }
}
