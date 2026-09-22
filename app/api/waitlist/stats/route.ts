import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saasSalesEnabled } from "@/lib/flipside-brand";

// Public endpoint - returns anonymized aggregate stats for the benchmark report
export async function GET() {
  if (!saasSalesEnabled()) return NextResponse.json({ error: "Software benchmarking is paused." }, { status: 410 });
  try {
    const entries = await prisma.waitlistEntry.findMany({
      where: { calcLeakTotal: { not: null } },
      select: { calcData: true, calcLeakTotal: true },
    });

    if (entries.length < 3) {
      // Not enough data to show a meaningful benchmark yet
      return NextResponse.json({ enough: false, count: entries.length });
    }

    const totals = entries.map((e) => e.calcLeakTotal as number);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const scopes = entries.map((e) => ((e.calcData as Record<string, number>)?.scopeLeak ?? 0));
    const reports = entries.map((e) => ((e.calcData as Record<string, number>)?.reportLeak ?? 0));
    const invoices = entries.map((e) => ((e.calcData as Record<string, number>)?.invoiceLeak ?? 0));
    const referrals = entries.map((e) => ((e.calcData as Record<string, number>)?.referralLeak ?? 0));

    // Biggest leak category across all submissions
    const avgScope = avg(scopes);
    const avgReport = avg(reports);
    const avgInvoice = avg(invoices);
    const avgReferral = avg(referrals);

    const biggestLeak = [
      { label: "Unbilled scope creep", avg: avgScope },
      { label: "Report writing time", avg: avgReport },
      { label: "Invoice follow-up", avg: avgInvoice },
      { label: "Referral revenue gap", avg: avgReferral },
    ].sort((a, b) => b.avg - a.avg)[0].label;

    return NextResponse.json({
      enough: true,
      count: entries.length,
      avgLeakTotal: Math.round(avg(totals)),
      avgScopeLeak: Math.round(avgScope),
      avgReportLeak: Math.round(avgReport),
      avgInvoiceLeak: Math.round(avgInvoice),
      avgReferralLeak: Math.round(avgReferral),
      biggestLeak,
    });
  } catch (err) {
    console.error("Stats error", err);
    return NextResponse.json({ enough: false, count: 0 });
  }
}
