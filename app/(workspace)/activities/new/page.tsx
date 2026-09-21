import { requireStaffPage } from "@/lib/staff-access";
import { createActivity } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { options } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function NewActivityPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const [profiles, leads, jobs] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, profileName: true }, orderBy: { profileName: "asc" } }),
    prisma.lead.findMany({ where: { deletedAt: null }, select: { id: true, leadName: true }, orderBy: { leadName: "asc" } }),
    prisma.job.findMany({ select: { id: true, jobName: true }, orderBy: { jobName: "asc" } })
  ]);

  return (
    <>
      <PageHeader title="New activity" body="Log a call, email, note, or follow-up against a contact, lead, or job." />
      <div className="mx-auto max-w-2xl">
        <form action={createActivity} className="grid gap-5 rounded-xl border border-border bg-white p-6 shadow-soft">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold" htmlFor="activityType">Type</label>
            <select
              id="activityType"
              name="activityType"
              defaultValue={sp.activityType ?? "NOTE"}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              {options.activityTypes.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-semibold" htmlFor="subject">Subject</label>
            <input
              id="subject"
              name="subject"
              required
              className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Call with client, Follow-up on estimate, etc."
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-semibold" htmlFor="body">Notes / body</label>
            <textarea
              id="body"
              name="body"
              rows={4}
              className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Add any relevant details..."
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-semibold" htmlFor="dueDate">Due date</label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={sp.dueDate ?? ""}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold" htmlFor="relatedProfileId">Contact</label>
              <select
                id="relatedProfileId"
                name="relatedProfileId"
                defaultValue={sp.relatedProfileId ?? ""}
                className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.profileName}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-semibold" htmlFor="relatedLeadId">Lead</label>
              <select
                id="relatedLeadId"
                name="relatedLeadId"
                defaultValue={sp.relatedLeadId ?? ""}
                className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.leadName}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-semibold" htmlFor="relatedJobId">Job</label>
              <select
                id="relatedJobId"
                name="relatedJobId"
                defaultValue={sp.relatedJobId ?? ""}
                className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.jobName}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Save activity
          </button>
        </form>
      </div>
    </>
  );
}
