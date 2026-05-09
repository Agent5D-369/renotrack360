import { NextResponse } from "next/server";
import { buildDocument } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const report = await prisma.weeklyReport.findUnique({
      where: { id },
      include: { job: { include: { clientProfile: true, property: true, organization: true } } }
    });
    if (!report) return NextResponse.json({ error: "Weekly report not found" }, { status: 404 });
    const org = report.job.organization;

    const pdf = await buildDocument({
      title: "Weekly Project Report",
      number: report.job.jobName,
      client: report.job.clientProfile?.profileName,
      property: report.job.property?.propertyAddress,
      sections: [
        { heading: "Client summary", body: report.clientSummary },
        { heading: "Work completed", body: report.workCompleted },
        { heading: "Issues found", body: report.issuesFound },
        { heading: "Decisions needed", body: report.decisionsNeeded },
        { heading: "Next week plan", body: report.nextWeekPlan }
      ],
      terms: org.weeklyReportFooter,
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
    // Mark as sent on first download
    if (!report.sentAt) {
      await prisma.weeklyReport.update({ where: { id }, data: { sentAt: new Date() } });
    }
    const weekEnding = report.weekEnding.toISOString().slice(0, 10);
    const slug = report.job.jobName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="weekly-report-${slug}-${weekEnding}.pdf"`
      }
    });
  } catch (error) {
    console.error("Weekly report PDF generation failed", error);
    return NextResponse.json({ error: "Weekly report PDF generation failed" }, { status: 500 });
  }
}
