import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { ImportWizard } from "@/components/import-wizard";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export default async function ImportsPage() {
  const imports = await prisma.importJob.findMany({
    where: { organizationId: DEFAULT_ORG_ID },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const resendConfigured = !!process.env.RESEND_API_KEY;

  return (
    <>
      <PageHeader
        title="Migration Concierge"
        body="Import leads, contacts, and cost catalog items from any CSV source or Google Sheets."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Import wizard */}
          <ImportWizard />
        </div>

        <div className="space-y-4 self-start">
          {/* Import history */}
          <Panel className="p-4">
            <h2 className="mb-3 font-bold">Import history</h2>
            {imports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imports yet.</p>
            ) : (
              <div className="grid gap-2">
                {imports.map((job) => (
                  <div key={job.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{job.importType}</p>
                      <span className={`text-xs font-bold ${job.status === "IMPORTED" ? "text-green-700" : job.status === "FAILED" ? "text-red-600" : "text-muted-foreground"}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {job.sourceSystem ?? "CSV"} · {job.importedRows}/{job.totalRows} rows · {dateShort(job.createdAt)}
                    </p>
                    {job.failedRows > 0 && (
                      <p className="text-xs text-red-600">{job.failedRows} failed rows</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Email setup note */}
          <Panel className={`p-4 ${resendConfigured ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Transactional email</p>
            <p className={`mt-1 text-sm font-semibold ${resendConfigured ? "text-green-700" : "text-amber-700"}`}>
              {resendConfigured ? "Resend connected" : "Not configured - using mailto fallback"}
            </p>
            {!resendConfigured && (
              <p className="mt-2 text-xs text-amber-700">
                Add <code className="rounded bg-white px-1">RESEND_API_KEY</code> to your environment to enable one-click email sending for reports, invoices, and approvals.
              </p>
            )}
          </Panel>

          {/* Import tips */}
          <Panel className="p-4">
            <h3 className="mb-2 text-sm font-bold">Tips for clean imports</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {[
                "CSV must have a header row - first row is skipped",
                "Column order does not matter - map them in the wizard",
                "Duplicate rows are skipped automatically",
                "Paste from Google Sheets or any spreadsheet export",
                "For large imports, split into batches of 500",
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="shrink-0 text-primary">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
