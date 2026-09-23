import { requireStaffPage } from "@/lib/staff-access";
import { updateJob } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";
import { jobInOrganization, profileInOrganization, propertyInOrganization, quoteInOrganization } from "@/lib/company-scope";
import { phaseInOrganization } from "@/lib/delivery-scope";
import { notFound } from "next/navigation";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const [job, profiles, properties, quotes, phases] = await Promise.all([
    prisma.job.findFirst({ where: jobInOrganization(actor.organizationId, { id }), include: { financialBaseline: true } }),
    prisma.profile.findMany({ where: profileInOrganization(actor.organizationId), select: { id: true, profileName: true }, orderBy: { profileName: "asc" } }),
    prisma.property.findMany({ where: propertyInOrganization(actor.organizationId), select: { id: true, propertyAddress: true }, orderBy: { propertyAddress: "asc" } }),
    prisma.quote.findMany({ where: quoteInOrganization(actor.organizationId), select: { id: true, quoteName: true }, orderBy: { quoteName: "asc" } }),
    prisma.renovationPhase.findMany({ where: phaseInOrganization(actor.organizationId, { jobId: id }), orderBy: { phaseNumber: "asc" }, select: { phaseNumber: true, phaseName: true } })
  ]);
  if (!job) notFound();
  const saveJob = updateJob.bind(null, job.id);

  return (
    <>
      <PageHeader title={`Edit ${job.jobName}`} body="Update job status, dates, contract value, payments received, active phase, permit status, risk, and operating notes." />
      {job.financialBaseline && <p className="mb-4 text-sm">Financial totals are managed by the reviewed contract and payment ledger.</p>}
      <EntityForm
        formKey="job"
        action={saveJob}
        submitLabel="Save job"
        fields={[
          { name: "jobName", label: "Job name", defaultValue: job.jobName },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))), defaultValue: job.clientProfileId, newHref: "/profiles/new" },
          { name: "propertyId", label: "Property", type: "select", options: relationOptions(properties.map((p) => ({ id: p.id, label: p.propertyAddress }))), defaultValue: job.propertyId, newHref: "/properties/new" },
          { name: "approvedQuoteId", label: "Approved quote", type: "select", options: relationOptions(quotes.map((q) => ({ id: q.id, label: q.quoteName }))), defaultValue: job.approvedQuoteId, newHref: "/quotes/new" },
          { name: "jobStatus", label: "Status", type: "select", options: options.jobStatuses, defaultValue: job.jobStatus },
          { name: "startDate", label: "Start date", type: "date", defaultValue: job.startDate?.toISOString().slice(0, 10) },
          { name: "targetCompletion", label: "Target completion", type: "date", defaultValue: job.targetCompletion?.toISOString().slice(0, 10) },
          { name: "contractAmount", label: "Contract amount", type: job.financialBaseline ? "hidden" : "number", defaultValue: Number(job.contractAmount) },
          { name: "amountPaid", label: "Amount paid", type: job.financialBaseline ? "hidden" : "number", defaultValue: Number(job.amountPaid) },
          { name: "activePhase", label: "Active phase override", type: "select", defaultValue: job.activePhase ?? "", options: [{ label: "Auto-detect (first incomplete phase)", value: "" }, ...phases.map((p) => ({ label: `${String(p.phaseNumber).padStart(2, "0")}. ${p.phaseName}`, value: p.phaseName }))], helpText: "Optional override. Leave blank to auto-detect from phase task completion." },
          { name: "weeklyReportDue", label: "Weekly report due", type: "date", defaultValue: job.weeklyReportDue?.toISOString().slice(0, 10) },
          { name: "permitStatus", label: "Permit status", defaultValue: job.permitStatus },
          { name: "riskLevel", label: "Risk level", type: "select", options: options.riskLevels, defaultValue: job.riskLevel },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: job.notes }
        ]}
      />
    </>
  );
}
