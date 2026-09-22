import { requireStaffPage } from "@/lib/staff-access";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { workItemSchema } from "@/lib/work-item-pilot";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { WorkItemPlan } from "@/components/work-item-plan";

export default async function WorkItemVersionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const version = await prisma.workItemVersion.findFirst({ where: { id, organizationId: DEFAULT_ORG_ID } });
  if (!version) notFound();
  const content = workItemSchema.parse(version.content);
  return <>
    <PageHeader title={`${version.name} · revision ${version.revision}`} body="Retained planning version. Later template changes cannot rewrite this record." />
    <Link href="/service-templates/work-items" className="mb-4 inline-block text-sm font-semibold text-primary">← Work-item library</Link>
    <Panel className="mb-5 p-4"><p className="text-sm">Adopted {version.createdAt.toISOString().slice(0, 10)}. Template edition {content.edition}. Job execution and acceptance have not been recorded by this adoption.</p></Panel>
    <WorkItemPlan content={content} />
  </>;
}
