import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function TranslationsPage() {
  const records = await prisma.translationRecord.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageHeader title="Translations" body="Dynamic translation records for client-facing updates, reports, selections, agreement summaries, and field notes with human review status." />
      <Panel className="p-5">
        <h3 className="text-lg font-bold">Translation queue</h3>
        <div className="mt-4 grid gap-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{record.sourceType} · {record.sourceLocale} to {record.targetLocale}</p>
                <StatusPill value={record.status} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{record.translatedText}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
