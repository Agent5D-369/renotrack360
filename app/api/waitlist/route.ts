import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { saasSalesEnabled } from "@/lib/flipside-brand";

const calcDataSchema = z.object({
  scopeLeak: z.number(),
  reportLeak: z.number(),
  invoiceLeak: z.number(),
  referralLeak: z.number(),
  total: z.number(),
  answers: z.object({
    jobsPerYear: z.number(),
    extrasPerJob: z.number(),
    hourlyRate: z.number(),
    extrasInvoiced: z.number(),
    reportMinutesPerWeek: z.number(),
    avgJobValue: z.number(),
    hardInvoicesPerYear: z.number(),
    referralsOutOf10: z.number(),
  }),
}).optional();

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(80).optional(),
  company: z.string().max(120).optional(),
  planInterest: z.enum(["STARTER", "PRO", "COMMAND_CENTER", ""]).optional(),
  referralCode: z.string().max(80).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmTerm: z.string().max(120).optional(),
  calcData: calcDataSchema,
});

export async function POST(req: NextRequest) {
  if (!saasSalesEnabled()) return NextResponse.json({ error: "Software waitlist enrollment is paused." }, { status: 410 });
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "";
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 16) : undefined;

    const existing = await prisma.waitlistEntry.findUnique({ where: { email: data.email } });
    if (existing) {
      // Update calc data if they're submitting from the calculator
      if (data.calcData && !existing.calcLeakTotal) {
        await prisma.waitlistEntry.update({
          where: { email: data.email },
          data: { calcLeakTotal: data.calcData.total, calcData: data.calcData as object },
        });
      }
      const position = await prisma.waitlistEntry.count({ where: { createdAt: { lte: existing.createdAt } } });
      return NextResponse.json({ already: true, position });
    }

    await prisma.waitlistEntry.create({
      data: {
        email: data.email,
        firstName: data.firstName || null,
        company: data.company || null,
        planInterest: data.planInterest || null,
        referralCode: data.referralCode || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        utmTerm: data.utmTerm || null,
        ipHash,
        calcLeakTotal: data.calcData?.total ?? null,
        calcData: (data.calcData as object) ?? null,
      },
    });

    const position = await prisma.waitlistEntry.count();

    // Fire-and-forget Formspree notification emails
    const isCalcSubmission = !!data.calcData;
    const formspreeUrl = isCalcSubmission
      ? "https://formspree.io/f/xeenzvzj"   // Quiz: Profit Leak
      : "https://formspree.io/f/xykopljq";  // Early Founder Signup

    const formspreeBody: Record<string, unknown> = {
      email: data.email,
      name: data.firstName || "",
      plan: data.planInterest || "Not specified",
      position,
      source: isCalcSubmission ? "Profit Leak Calculator" : "Waitlist Form",
    };
    if (isCalcSubmission && data.calcData) {
      formspreeBody.leakTotal = `$${Math.round((data.calcData as { total: number }).total).toLocaleString()}/yr`;
    }

    // Non-blocking - do not await, do not fail the response if Formspree is down
    fetch(formspreeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(formspreeBody),
    }).catch(() => {});

    return NextResponse.json({ success: true, position });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", issues: err.issues }, { status: 422 });
    }
    console.error("Waitlist error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
