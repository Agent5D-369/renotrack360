import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ApprovalsPage() {
  const approvals = await prisma.clientApproval.findMany({ include: { estimate: { include: { clientProfile: true } } }, orderBy: { updatedAt: "desc" } });
  const options = await prisma.estimateOption.findMany({ include: { estimate: true }, orderBy: { sortOrder: "asc" } });

  return (
    <>
      <PageHeader title="Approvals" body="Single-click approvals, signatures, good/better/best options, and client decision tracking." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Client approvals</h3>
          <div className="mt-4 grid gap-3">
            {approvals.map((approval) => (
              <div key={approval.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{approval.approvalType}</p>
                  <StatusPill value={approval.status} />
                </div>
                <p className="text-sm text-muted-foreground">{approval.estimate?.estimateNumber ?? "Approval"} · sent {dateShort(approval.sentAt)}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Good / Better / Best options</h3>
          <div className="mt-4 grid gap-3">
            {options.map((option) => (
              <div key={option.id} className="rounded-md border border-border p-3">
                <p className="font-semibold">{option.optionTier}: {option.optionName}</p>
                <p className="text-sm text-muted-foreground">{option.estimate.estimateNumber} · {option.included ? "included" : "optional"}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
