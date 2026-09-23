import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ReviewBrand = {
  name: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  companyTagline: string | null;
  reviewLink: string | null;
};

const noBrand: ReviewBrand = { name: null, logoUrl: null, brandColor: null, companyTagline: null, reviewLink: null };

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const request = await prisma.feedbackRequest.findUnique({
      where: { token },
      include: {
        job: { include: { clientProfile: true, organization: true } },
        profile: { select: { profileName: true, organizationId: true } },
      },
    });

    if (!request) return NextResponse.json({ error: "Review link not found or expired." }, { status: 404 });

    if (request.expiresAt && request.expiresAt < new Date()) {
      return NextResponse.json({ error: "This review link has expired. Contact your contractor for a new one." }, { status: 410 });
    }

    // The owning company is derived from the record this token points at, never from the default
    // organization: a fallback to the default brand showed Flipside's name, logo and review link to a
    // second company's client. When ownership cannot be established the surface carries no brand at all
    // rather than someone else's.
    const owningOrganizationId = request.job?.organizationId ?? request.profile?.organizationId ?? null;
    const org = owningOrganizationId
      ? await prisma.organization.findUnique({
          where: { id: owningOrganizationId },
          select: { reviewLink: true, name: true, logoUrl: true, brandColor: true, companyTagline: true },
        })
      : null;
    const brand: ReviewBrand = org ?? noBrand;

    return NextResponse.json({
      id: request.id,
      requestType: request.requestType,
      jobName: request.job?.jobName,
      clientName: request.profile?.profileName ?? request.job?.clientProfile?.profileName,
      orgName: brand.name,
      orgLogoUrl: brand.logoUrl ?? null,
      orgBrandColor: brand.brandColor ?? null,
      orgTagline: brand.companyTagline ?? null,
      reviewLink: brand.reviewLink ?? null,
      alreadyReceived: ["RECEIVED", "PUBLISHED"].includes(request.status),
      rating: request.rating,
      testimonial: request.publicTestimonial,
    });
  } catch (err) {
    console.error("Review GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { rating, testimonial } = await req.json() as { rating: number; testimonial?: string };

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "A rating of 1–5 is required." }, { status: 400 });
    }

    const request = await prisma.feedbackRequest.findUnique({ where: { token } });
    if (!request) return NextResponse.json({ error: "Not found." }, { status: 404 });

    if (request.expiresAt && request.expiresAt < new Date()) {
      return NextResponse.json({ error: "This link has expired." }, { status: 410 });
    }

    if (["RECEIVED", "PUBLISHED"].includes(request.status)) {
      return NextResponse.json({ error: "Feedback already received." }, { status: 409 });
    }

    await prisma.feedbackRequest.update({
      where: { token },
      data: {
        status: "RECEIVED",
        rating,
        feedback: testimonial?.trim() || null,
        publicTestimonial: testimonial?.trim() || null,
        receivedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Review POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
