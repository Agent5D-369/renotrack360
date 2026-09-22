import { requireStaffPage } from "@/lib/staff-access";
import { ChangeOrderForm } from "@/components/change-order-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { money } from "@/lib/format";
import { createChangeOrder } from "@/app/actions";
export default async function NewChangeOrderPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaffPage();
  const sp = await searchParams;
  const [jobs, profiles, prices] = await Promise.all([prisma.job.findMany({ where: { organizationId: DEFAULT_ORG_ID }, select: { id: true, jobName: true, clientProfileId: true }, orderBy: { jobName: "asc" } }),
prisma.profile.findMany({ where: { organizationId: DEFAULT_ORG_ID }, select: { id: true, profileName: true }, orderBy: { profileName: "asc" } }),
prisma.priceSnapshot.findMany({ where: { organizationId: DEFAULT_ORG_ID }, orderBy: { createdAt: "desc" } })]);
  const job = jobs.find(j => j.id === sp.jobId);
  return <><PageHeader title="New change order" body="Document the scope and price for review before approval." />
    <ChangeOrderForm action={createChangeOrder} jobs={jobs} profiles={profiles} prices={prices.map(p => ({ id: p.id, name: p.name, label: money(p.sellingPrice) }))}
      defaults={{ jobId: job?.id, clientProfileId: job?.clientProfileId ?? "", title: sp.title ?? "", reason: sp.reason ?? "", clientRequested: sp.clientRequested === "true" }} /></>;
}
