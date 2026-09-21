import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { createFeedbackRequest, updateFeedbackStatus, generateReviewToken } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { dateShort } from "@/lib/format";
import { buildSmsLink } from "@/lib/sms";
import { buildMailtoLink } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";

const REQUEST_TYPES = [
  { value: "GOOGLE_REVIEW", label: "Google review request" },
  { value: "TESTIMONIAL", label: "Written testimonial" },
  { value: "REFERRAL_REQUEST", label: "Referral request" },
  { value: "30_DAY_CHECK_IN", label: "30-day satisfaction check-in" },
  { value: "90_DAY_CHECK_IN", label: "90-day check-in" },
];

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [job, org] = await Promise.all([
    prisma.job.findUniqueOrThrow({
      where: { id },
      include: {
        clientProfile: true,
        property: true,
        feedbackRequests: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID }, select: { reviewLink: true, name: true } }),
  ]);

  const client = job.clientProfile;

  return (
    <>
      <PageHeader
        title="Testimonials and Reviews"
        body={`${job.jobName} - request, track, and capture client feedback`}
      />
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/jobs/${id}`} className="font-semibold text-muted-foreground hover:text-foreground">← Job</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/jobs/${id}/closeout`} className="font-semibold text-muted-foreground hover:text-foreground">Closeout package</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Existing feedback requests */}
          <Panel className="p-5">
            <h3 className="mb-4 font-bold">Feedback requests ({job.feedbackRequests.length})</h3>
            {job.feedbackRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet. Create your first one on the right.</p>
            ) : (
              <div className="grid gap-4">
                {job.feedbackRequests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{REQUEST_TYPES.find((t) => t.value === req.requestType)?.label ?? req.requestType}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Requested {dateShort(req.requestedAt)}</p>
                      </div>
                      <StatusPill value={req.status} />
                    </div>

                    {req.rating && (
                      <p className="mt-2 text-sm">Rating: <strong>{"★".repeat(req.rating)}{"☆".repeat(5 - req.rating)}</strong></p>
                    )}
                    {req.feedback && (
                      <p className="mt-2 rounded-md bg-muted p-3 text-sm italic">&ldquo;{req.feedback}&rdquo;</p>
                    )}
                    {req.publicTestimonial && (
                      <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3">
                        <p className="text-xs font-bold uppercase text-green-700">Public testimonial</p>
                        <p className="mt-1 text-sm italic">&ldquo;{req.publicTestimonial}&rdquo;</p>
                      </div>
                    )}

                    {/* Review link */}
                    <div className="mt-3 border-t border-border pt-3">
                      {req.token ? (
                        <div className="space-y-1.5">
                          <p className="text-xs font-bold text-green-700">Review link active</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1 text-xs font-mono">
                              {`/review/${req.token}`}
                            </code>
                            <Link
                              href={`/review/${req.token}`}
                              target="_blank"
                              className="text-xs font-semibold text-primary hover:underline shrink-0"
                            >
                              Preview →
                            </Link>
                          </div>
                          {client?.phone && (
                            <a
                              href={buildSmsLink(client.phone, `Hi ${client.profileName?.split(" ")[0] ?? "there"}, we'd love your feedback on ${job.jobName}. Takes 60 seconds: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://renotrack360.com"}/review/${req.token}`)}
                              className="block rounded-md border border-border px-3 py-1.5 text-center text-xs font-semibold hover:bg-muted"
                            >
                              📱 Text review link
                            </a>
                          )}
                        </div>
                      ) : (
                        <form action={generateReviewToken.bind(null, req.id)}>
                          <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                            Generate review link
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Status update */}
                    {req.status === "REQUESTED" && (
                      <form action={updateFeedbackStatus} className="mt-3 grid gap-2">
                        <input type="hidden" name="id" value={req.id} />
                        <textarea name="feedback" placeholder="Client feedback (optional)" className="w-full rounded-md border border-border px-3 py-2 text-sm" rows={2} />
                        <textarea name="publicTestimonial" placeholder="Public testimonial quote (optional)" className="w-full rounded-md border border-border px-3 py-2 text-sm" rows={2} />
                        <div className="flex gap-2">
                          <select name="rating" className="h-9 flex-1 rounded-md border border-border px-2 text-sm">
                            <option value="">Rating (optional)</option>
                            {[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} star{r !== 1 ? "s" : ""}</option>)}
                          </select>
                          <input type="hidden" name="status" value="RECEIVED" />
                          <button type="submit" className="rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">Mark received</button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-4 self-start">
          {/* Create new request */}
          <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">New request</p>
            <form action={createFeedbackRequest} className="grid gap-3">
              <input type="hidden" name="jobId" value={id} />
              {client && <input type="hidden" name="profileId" value={client.id} />}
              <select name="requestType" className="h-10 rounded-md border border-border px-2 text-sm">
                {REQUEST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button type="submit" className="h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Create request</button>
            </form>
          </Panel>

          {/* Quick send buttons */}
          {client && (
            <Panel className="p-4">
              <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Quick send to {client.profileName}</p>
              <div className="grid gap-2">
                {client.phone && org?.reviewLink && (
                  <a
                    href={buildSmsLink(client.phone, `Hi ${client.profileName}, thank you for choosing ${org.name}! We'd love your Google review: ${org.reviewLink}`)}
                    className="block rounded-md border border-border px-3 py-2.5 text-center text-sm font-semibold hover:bg-muted"
                  >
                    📱 Text review request
                  </a>
                )}
                {client.phone && (
                  <a
                    href={buildSmsLink(client.phone, `Hi ${client.profileName}, do you know anyone else who might be thinking about a renovation? Happy to help - just send them my way.`)}
                    className="block rounded-md border border-border px-3 py-2.5 text-center text-sm font-semibold hover:bg-muted"
                  >
                    📱 Text referral request
                  </a>
                )}
                {client.email && (
                  <a
                    href={buildMailtoLink(client.email, `How did we do? - ${job.jobName}`, `Hi ${client.profileName},\n\nThank you for trusting us with your project. We'd love to hear how everything went.\n\nIf you're happy with the work, a quick Google review means the world to a small team: ${org?.reviewLink ?? "[add review link in Settings]"}\n\nAnd if you know anyone planning a renovation, we'd be grateful for the introduction.\n\n- ${org?.name ?? "Your contractor"}`)}
                    className="block rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/10"
                  >
                    ✉ Email review + referral request
                  </a>
                )}
                {!org?.reviewLink && (
                  <p className="text-xs text-muted-foreground">
                    Add your Google review link in{" "}
                    <Link href="/settings" className="text-primary hover:underline">Settings</Link>.
                  </p>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
