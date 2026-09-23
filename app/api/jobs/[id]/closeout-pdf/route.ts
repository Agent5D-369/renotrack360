
import { requireStaff, staffApiDenial } from "@/lib/staff-access";
import { jobInOrganization, weeklyReportInOrganization } from "@/lib/company-scope";
import { phaseInOrganization, taskInOrganization, invoiceInOrganization, changeOrderInOrganization, workPackageInOrganization } from "@/lib/delivery-scope";
﻿import { NextResponse } from "next/server";
import { buildDocument } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";
import { packageStatusSelect, phaseWithPackageEvidence } from "@/lib/work-package";
import { money } from "@/lib/format";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const actor = await requireStaff();
  try {
    const { id } = await params;
    const job = await prisma.job.findFirst({
      where: jobInOrganization(actor.organizationId, { id }),
      include: {
        phases: { where: phaseInOrganization(actor.organizationId, { jobId: id }), orderBy: { phaseNumber: "asc" }, include: { tasks: { where: taskInOrganization(actor.organizationId, { jobId: id }) }, workPackages: { where: workPackageInOrganization(actor.organizationId, { jobId: id }), select: packageStatusSelect } } },
        weeklyReports: { where: weeklyReportInOrganization(actor.organizationId, { jobId: id }), orderBy: { weekEnding: "asc" } },
        changeOrders: { where: changeOrderInOrganization(actor.organizationId, { jobId: id }), orderBy: { createdAt: "asc" } },
        invoices: { where: invoiceInOrganization(actor.organizationId, { jobId: id, status: { not: "VOID" } }), orderBy: { dueDate: "asc" } },
        clientProfile: true,
        property: true,
        organization: true,
        financialBaseline: true,
      },
    });

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const org = job.organization;
    const openChangeOrders = job.changeOrders.filter((co) => ["DRAFT", "SENT"].includes(co.status));
    const totalBalance = job.invoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
    const phaseState = (phase: typeof job.phases[number]) => phaseWithPackageEvidence(phase.tasks.length ? phase.tasks.every(t => t.status === "COMPLETE") ? "COMPLETE" : phase.tasks.some(t => t.status === "BLOCKED") ? "BLOCKED" : phase.tasks.some(t => t.status === "IN_PROGRESS") ? "IN_PROGRESS" : "NOT_STARTED" : phase.status, phase.workPackages);
    const phasesDone = job.phases.filter(phase => phaseState(phase) === "COMPLETE").length;
    const phaseStatuses = job.phases.map(phase => String(phase.phaseNumber).padStart(2, "0") + ". " + phase.phaseName + " - " + phaseState(phase).replaceAll("_", " ")).join("\n");

    const changeOrderSummary = job.changeOrders.length
      ? job.changeOrders.map((co) => `${co.changeOrderTitle}: ${money(co.addedCost)} (${co.status.toLowerCase()})`).join("\n")
      : "No change orders on this job.";

    const reportSummary = job.weeklyReports.length
      ? job.weeklyReports.map((r) => `Week ending ${r.weekEnding.toISOString().slice(0, 10)}: ${(r.clientSummary ?? r.workCompleted ?? "").slice(0, 120)}...`).join("\n\n")
      : "No weekly reports on record.";

    const invoiceSummary = job.invoices.length
      ? job.invoices.map((inv) => `${inv.invoiceNumber}: ${money(inv.total)} - balance ${money(inv.balanceDue)} (${inv.status.toLowerCase()})`).join("\n")
      : "No invoices on record.";

    const totalContract = Number(job.contractAmount);
    const totalChangeOrders = job.changeOrders
      .filter((co) => ["APPROVED", "COMPLETED"].includes(co.status))
      .reduce((sum, co) => sum + Number(co.addedCost), 0);

    const warnings: string[] = [];
    if (!job.financialBaseline) warnings.push("Financial history has not completed owner review. Recorded figures are not a reconciled final statement.");
    if (openChangeOrders.length > 0) warnings.push(`${openChangeOrders.length} change order(s) still unsigned`);
    if (totalBalance > 0) warnings.push(`Outstanding balance: ${money(totalBalance)}`);
    if (phasesDone < job.phases.length) warnings.push(`${job.phases.length - phasesDone} phase(s) not marked complete`);

    const pdf = await buildDocument({
      title: warnings.length ? `Project Closeout Package - ${warnings.length} item(s) open` : "Project Closeout Package",
      number: job.jobName,
      client: job.clientProfile?.profileName,
      property: job.property?.propertyAddress,
      sections: [
        ...(warnings.length ? [{ heading: "Open items at time of export", body: warnings.join("\n") }] : []),
        {
          heading: "Project summary",
          body: `Contract amount: ${money(totalContract)}\nApproved changes (informational; not added again): ${money(totalChangeOrders)}\nTotal project value: ${money(totalContract)}\nOutstanding invoiced balance: ${money(totalBalance)}`,
        },
        { heading: "Phase completion", body: phaseStatuses },
        { heading: "Change orders", body: changeOrderSummary },
        { heading: "Weekly reports summary", body: reportSummary },
        { heading: "Invoice record", body: invoiceSummary },
      ],
      totals: [
        { label: "Total project value", value: totalContract },
        { label: "Outstanding invoiced balance", value: totalBalance },
      ],
      terms: org.weeklyReportFooter,
      brand: {
        companyName: org.name,
        tagline: org.companyTagline,
        logoUrl: org.logoUrl,
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
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="closeout-${slug}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Closeout PDF error", err);
    return NextResponse.json({ error: "Closeout PDF generation failed" }, { status: 500 });
  }
}
