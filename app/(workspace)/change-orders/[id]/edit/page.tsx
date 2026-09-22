import { requireStaffPage } from "@/lib/staff-access";
import { ChangeOrderForm } from "@/components/change-order-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { money } from "@/lib/format";
import { updateChangeOrder } from "@/app/actions";
export default async function EditChangeOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [order, jobs, profiles, prices] = await Promise.all([
    prisma.changeOrder.findFirstOrThrow({ where: { id, job: { organizationId: DEFAULT_ORG_ID } } }), prisma.job.findMany({ where: { organizationId: DEFAULT_ORG_ID }, select: { id: true, jobName: true, clientProfileId: true }, orderBy: { jobName: "asc" } }),
prisma.profile.findMany({ where: { organizationId: DEFAULT_ORG_ID }, select: { id: true, profileName: true }, orderBy: { profileName: "asc" } }),
prisma.priceSnapshot.findMany({ where: { organizationId: DEFAULT_ORG_ID }, orderBy: { createdAt: "desc" } })]);
  return <><PageHeader title={"Edit: " + order.changeOrderTitle} body="Revising a draft revokes its pending approval links." />
    <ChangeOrderForm action={updateChangeOrder.bind(null, id)} order={order} jobs={jobs} profiles={profiles} prices={prices.map(p => ({ id: p.id, name: p.name, label: money(p.sellingPrice) }))} /></>;
}
