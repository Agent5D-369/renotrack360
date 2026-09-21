import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { addJobPhoto, deleteJobPhoto, importPhotosFromLogs, tagJobPhoto } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";

const LABELS = ["BEFORE", "DURING", "AFTER"] as const;
const LABEL_COLORS = {
  BEFORE: "border-blue-200 bg-blue-50 text-blue-700",
  DURING: "border-amber-200 bg-amber-50 text-amber-700",
  AFTER: "border-green-200 bg-green-50 text-green-700",
};

export default async function GalleryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const job = await prisma.job.findUniqueOrThrow({
    where: { id },
    include: {
      jobPhotos: { orderBy: [{ label: "asc" }, { takenAt: "asc" }] },
      phases: { select: { phaseName: true }, orderBy: { phaseNumber: "asc" } },
      clientProfile: true,
      property: true,
    },
  });

  const photosByLabel = {
    BEFORE: job.jobPhotos.filter((p) => p.label === "BEFORE"),
    DURING: job.jobPhotos.filter((p) => p.label === "DURING"),
    AFTER: job.jobPhotos.filter((p) => p.label === "AFTER"),
  };

  const phaseOptions = job.phases.map((p) => p.phaseName);

  return (
    <>
      <PageHeader
        title="Before / After Gallery"
        body={`${job.jobName} - organize photos by label, tag phases and rooms, generate a proof document`}
        actionHref={`/api/jobs/${id}/gallery-pdf`}
        actionLabel="↓ Download gallery PDF"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/jobs/${id}`} className="font-semibold text-muted-foreground hover:text-foreground">← Job</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/jobs/${id}/closeout`} className="font-semibold text-muted-foreground hover:text-foreground">Closeout</Link>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{job.jobPhotos.length} photos organized</span>
      </div>

      {/* Import from logs */}
      <Panel className="mb-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Import photos from daily logs</p>
            <p className="text-xs text-muted-foreground">Pull in photos from field reports and weekly reports. Already-imported photos are skipped.</p>
          </div>
          <form action={importPhotosFromLogs.bind(null, id)}>
            <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
              Import from logs
            </button>
          </form>
        </div>
      </Panel>

      <div className="grid gap-6">
        {LABELS.map((label) => (
          <div key={label}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${LABEL_COLORS[label]}`}>
                {label}
              </span>
              <span className="text-sm text-muted-foreground">{photosByLabel[label].length} photos</span>
            </div>

            {photosByLabel[label].length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No {label.toLowerCase()} photos yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Import from logs above or add a URL below.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {photosByLabel[label].map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-border bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption ?? `${label} photo`}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground truncate">{photo.phase ?? "No phase"} {photo.roomArea ? `· ${photo.roomArea}` : ""}</p>
                      {photo.caption && <p className="text-xs font-semibold truncate">{photo.caption}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <details className="flex-1">
                        <summary className="cursor-pointer text-xs font-semibold text-primary">Edit tag</summary>
                        <form action={tagJobPhoto} className="mt-2 grid gap-1.5">
                          <input type="hidden" name="id" value={photo.id} />
                          <select name="label" defaultValue={photo.label} className="h-7 rounded border border-border px-1 text-xs">
                            {LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                          </select>
                          <select name="phase" defaultValue={photo.phase ?? ""} className="h-7 rounded border border-border px-1 text-xs">
                            <option value="">No phase</option>
                            {phaseOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input name="roomArea" defaultValue={photo.roomArea ?? ""} placeholder="Room / area" className="h-7 rounded border border-border px-1.5 text-xs" />
                          <input name="caption" defaultValue={photo.caption ?? ""} placeholder="Caption" className="h-7 rounded border border-border px-1.5 text-xs" />
                          <button type="submit" className="h-7 rounded bg-primary text-xs font-semibold text-primary-foreground">Save</button>
                        </form>
                        </details>
                        <form action={deleteJobPhoto}>
                          <input type="hidden" name="id" value={photo.id} />
                          <ConfirmSubmitButton
                            message="Remove this photo?"
                            className="shrink-0 text-xs text-muted-foreground hover:text-red-600"
                          >
                            ✕
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add photo by URL */}
      <Panel className="mt-6 p-5">
        <h3 className="mb-3 font-bold">Add photo by URL</h3>
        <form action={addJobPhoto} className="grid gap-3 md:grid-cols-[1fr_120px_140px_auto]">
          <input type="hidden" name="jobId" value={id} />
          <input name="url" required placeholder="https://..." className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
          <select name="label" className="h-10 rounded-md border border-border px-2 text-sm">
            {LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <input name="roomArea" placeholder="Room / area" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
          <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Add</button>
        </form>
      </Panel>
    </>
  );
}
