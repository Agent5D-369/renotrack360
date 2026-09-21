import { prisma } from "@/lib/prisma";
import { publishedReportForToken } from "@/lib/report-publication";
import { buildDocument } from "@/lib/pdf";

export async function GET(_: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const publication = await publishedReportForToken(prisma, id, token);
  if (!publication) return Response.json({ error: "Published report not found" }, { status: 404 });
  const job = publication.report.job, org = job.organization;
  const bytes = await buildDocument({ title: "Weekly Project Report", number: `${job.jobName} / revision ${publication.revision}`,
    client: job.clientProfile?.profileName, property: job.property?.propertyAddress,
    sections: [
      { heading: "Client summary", body: publication.clientSummary },
      { heading: "Work completed", body: publication.workCompleted },
      { heading: "Issues found", body: publication.issuesFound },
      { heading: "Decisions needed", body: publication.decisionsNeeded },
      { heading: "Budget notes", body: publication.budgetNotes },
      { heading: "Schedule notes", body: publication.scheduleNotes },
      { heading: "Next week plan", body: publication.nextWeekPlan },
    ], terms: org.weeklyReportFooter,
    brand: { companyName: org.name, tagline: org.companyTagline, logoUrl: org.logoUrl, color: org.brandColor,
      address: org.address, phone: org.phone, email: org.email, website: org.website },
  });
  return new Response(new Uint8Array(bytes), { headers: {
    "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="weekly-report-${publication.weekEnding.toISOString().slice(0, 10)}-r${publication.revision}.pdf"`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  } });
}
