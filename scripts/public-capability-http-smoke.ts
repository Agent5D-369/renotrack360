/**
 * Public capability inventory and its HTTP proof.
 *
 * Surfaces: the client portal page and its report/request routes, the client approval page and
 * its reviewed-proposal document route, the review (feedback) page, staff-invite acceptance, and
 * the waitlist endpoints. For each surface this smoke records the credential, the record it can
 * reach, whether the credential binds to exactly one record, how it expires or is revoked, what
 * an unauthenticated caller can enumerate, and what it writes. It then proves the binding against
 * a running local server: a valid token returns its own record, a missing or random token is
 * refused, and a token for record A never returns record B.
 *
 * It also proves the two staff surfaces that hand client capability tokens to staff -
 * /client-portal and /approvals - render only the acting company's records.
 *
 * Fixture discipline: WeeklyReportPublication, ChangeOrderSnapshot, EstimateSnapshot and the
 * other retained tables reject UPDATE and DELETE unconditionally, so a smoke that creates one of
 * them can never clean up after itself. This smoke therefore writes only to tables a delete can
 * reach, and exercises the retained-record surfaces (published reports, live approvals) with the
 * rows the mirror already holds. A live approval that is still open does not exist in the mirror,
 * so the decision write is proven to refuse every non-matching response and to mutate nothing,
 * and that gap is reported rather than asserted away.
 *
 * Requires the local mirror database named in .preservation/media-http-env.json and a local
 * server built from this commit. SMOKE_ORIGIN overrides the origin (default http://localhost:3010).
 * Evidence is written to .preservation/public-capability-local-http.json even when a proof fails.
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const hex = (bytes: number) => randomBytes(bytes).toString("hex");
const randomHex64 = () => hex(32);

async function main() {
  const cfg = JSON.parse(readFileSync(".preservation/media-http-env.json", "utf8"));
  const target = new URL(cfg.DATABASE_URL);
  assert.equal(target.hostname, "127.0.0.1", "the public capability smoke only runs against the local mirror");
  assert.equal(target.pathname, "/flipside_restore_media_v2", "the public capability smoke only runs against the retained mirror");
  const db = new PrismaClient({ datasources: { db: { url: cfg.DATABASE_URL } }, log: [] });
  const origin = process.env.SMOKE_ORIGIN ?? "http://localhost:3010";
  const suffix = randomUUID().slice(0, 8);
  const foreignMarker = `FOREIGN_COMPANY_${suffix}`;
  const requestMarker = `PORTAL_REQUEST_${suffix}`;
  const ownEstimateNumber = `OWN-EST-${suffix}`;
  const foreignEstimateNumber = `FOREIGN-EST-${suffix}`;
  const ownOptionName = `Own option ${suffix}`;
  const foreignOptionName = `Foreign option ${suffix}`;
  const inviteEmail = `public-capability-${suffix}@example.invalid`;
  const cleanup = {
    activityIds: [] as string[], approvalIds: [] as string[], orderIds: [] as string[],
    feedbackIds: [] as string[], inviteIds: [] as string[], optionIds: [] as string[],
    auditIds: [] as string[], estimateIds: [] as string[], quoteIds: [] as string[],
    jobIds: [] as string[], profileIds: [] as string[], userIds: [] as string[], orgIds: [] as string[],
  };
  const proofs: Record<string, unknown> = {};
  const notVerified: string[] = [];
  const evidencePath = ".preservation/public-capability-local-http.json";
  const writeEvidence = () => writeFileSync(evidencePath, JSON.stringify({
    checkedAt: new Date().toISOString(), origin, database: target.pathname,
    commit: process.env.SMOKE_COMMIT ?? null, inventory, proofs, notVerified, productionMutations: false,
  }, null, 2));

  try {
    const owner = await db.user.findUniqueOrThrow({ where: { id: "report-wave-local-owner" } });
    const ownOrgId = owner.organizationId;
    assert.equal(ownOrgId, "flipside-org", "the smoke owner must belong to the acting company");
    const cookie = "next-auth.session-token=" + await encode({ secret: cfg.NEXTAUTH_SECRET, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (path: string, init: RequestInit = {}) => fetch(origin + path, { ...init, redirect: "manual", headers: { ...init.headers, cookie } });
    const anon = (path: string, init: RequestInit = {}) => fetch(origin + path, { ...init, redirect: "manual" });
    const post = (path: string, payload: unknown, useCookie = false) =>
      (useCookie ? http : anon)(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const textOf = async (response: Response) => await response.text();
    const jsonOf = async (response: Response) => JSON.parse(await response.text()) as Record<string, unknown>;

    // ─── Synthetic fixtures (every table here can be deleted again) ───────────────────────────
    const marker = await db.organization.create({ data: { name: foreignMarker, brandColor: "#123456", companyTagline: "Foreign tagline" } });
    cleanup.orgIds.push(marker.id);
    const ownProfile = await db.profile.create({ data: { organizationId: ownOrgId, profileName: `Public capability client ${suffix}`, profileType: "CURRENT_CLIENT" } });
    const foreignProfile = await db.profile.create({ data: { organizationId: marker.id, profileName: `${foreignMarker} client`, profileType: "CURRENT_CLIENT" } });
    const jobSelf = await db.job.create({ data: { organizationId: ownOrgId, jobName: `Public capability own job ${suffix}`, portalToken: randomHex64(), clientProfileId: ownProfile.id } });
    const jobForeign = await db.job.create({ data: { organizationId: marker.id, jobName: `${foreignMarker} job`, portalToken: randomHex64(), clientProfileId: foreignProfile.id } });
    cleanup.jobIds.push(jobSelf.id, jobForeign.id);
    cleanup.profileIds.push(ownProfile.id, foreignProfile.id);
    // A change order with an unissued approval request carries a capability token but no immutable
    // snapshot, so it can be created and removed inside one run.
    const orderSelf = await db.changeOrder.create({ data: { jobId: jobSelf.id, clientProfileId: ownProfile.id, changeOrderTitle: `Own change order ${suffix}`, reason: "Own change order reason", addedCost: "250.00", addedTime: 3, status: "SENT" } });
    const orderForeign = await db.changeOrder.create({ data: { jobId: jobForeign.id, clientProfileId: foreignProfile.id, changeOrderTitle: `${foreignMarker} change order`, reason: "Foreign change order reason", addedCost: "250.00", addedTime: 3, status: "SENT" } });
    const approvalUnreviewed = await db.clientApproval.create({ data: { changeOrderId: orderSelf.id, approvalType: "CHANGE_ORDER", token: randomHex64(), status: "SENT", sentAt: new Date(), signerEmail: ownProfile.email } });
    const approvalForeignUnreviewed = await db.clientApproval.create({ data: { changeOrderId: orderForeign.id, approvalType: "CHANGE_ORDER", token: randomHex64(), status: "SENT", sentAt: new Date(), signerEmail: foreignProfile.email } });
    cleanup.orderIds.push(orderSelf.id, orderForeign.id);
    cleanup.approvalIds.push(approvalUnreviewed.id, approvalForeignUnreviewed.id);

    const feedback = async (jobId: string | null, requestType: string, expiresAt: Date | null) =>
      db.feedbackRequest.create({ data: { jobId, requestType, token: hex(24), status: "REQUESTED", expiresAt } });
    const feedbackOwn = await feedback(jobSelf.id, `Pulse own ${suffix}`, new Date(Date.now() + 7 * 86_400_000));
    const feedbackForeign = await feedback(jobForeign.id, `${foreignMarker} pulse`, new Date(Date.now() + 7 * 86_400_000));
    const feedbackExpired = await feedback(jobSelf.id, `Pulse expired ${suffix}`, new Date(Date.now() - 86_400_000));
    const feedbackOrphan = await db.feedbackRequest.create({ data: { requestType: `Unattached pulse ${suffix}`, token: hex(24) } });
    cleanup.feedbackIds.push(feedbackOwn.id, feedbackForeign.id, feedbackExpired.id, feedbackOrphan.id);

    const invite = async (organizationId: string, role: "ADMIN" | "CLIENT", expiresAt: Date) =>
      db.inviteToken.create({ data: { email: inviteEmail, organizationId, role, token: hex(32), expiresAt, invitedByUserId: owner.id } });
    const inviteValid = await invite(ownOrgId, "ADMIN", new Date(Date.now() + 86_400_000));
    const inviteExpired = await invite(ownOrgId, "ADMIN", new Date(Date.now() - 86_400_000));
    const inviteForeign = await invite(marker.id, "ADMIN", new Date(Date.now() + 86_400_000));
    const inviteClientRole = await invite(ownOrgId, "CLIENT", new Date(Date.now() + 86_400_000));
    cleanup.inviteIds.push(inviteValid.id, inviteExpired.id, inviteForeign.id, inviteClientRole.id);

    const quoteSelf = await db.quote.create({ data: { organizationId: ownOrgId, quoteName: `Own capability quote ${suffix}`, totalTarget: 1200 } });
    const quoteForeign = await db.quote.create({ data: { organizationId: marker.id, quoteName: `${foreignMarker} quote`, totalTarget: 1200 } });
    const estimateSelf = await db.estimate.create({ data: { quoteId: quoteSelf.id, estimateNumber: ownEstimateNumber, total: 1200, status: "SENT" } });
    const estimateForeign = await db.estimate.create({ data: { quoteId: quoteForeign.id, estimateNumber: foreignEstimateNumber, total: 1200, status: "SENT" } });
    const optionSelf = await db.estimateOption.create({ data: { estimateId: estimateSelf.id, optionName: ownOptionName, optionTier: "GOOD", total: 1200 } });
    const optionForeign = await db.estimateOption.create({ data: { estimateId: estimateForeign.id, optionName: foreignOptionName, optionTier: "GOOD", total: 1200 } });
    cleanup.quoteIds.push(quoteSelf.id, quoteForeign.id);
    cleanup.estimateIds.push(estimateSelf.id, estimateForeign.id);
    cleanup.optionIds.push(optionSelf.id, optionForeign.id);

    // ─── Retained rows the mirror already holds, used read-only ───────────────────────────────
    const reportJobs = await db.job.findMany({
      where: { portalToken: { not: null }, weeklyReports: { some: { publications: { some: {} } } } },
      select: { id: true, jobName: true, portalToken: true, weeklyReports: { where: { publications: { some: {} } }, select: { publications: { orderBy: { revision: "desc" }, take: 1, select: { id: true } } } } },
      take: 2,
    });
    const changeApprovals = (await db.clientApproval.findMany({
      where: { approvalType: "CHANGE_ORDER", token: { not: null }, status: { notIn: ["EXPIRED"] }, snapshot: { expiresAt: { gt: new Date() } } },
      select: { id: true, token: true, status: true, signerName: true, approvedAt: true, declinedAt: true, snapshot: { select: { contentDigest: true, job: { select: { jobName: true } } } } },
      orderBy: { sentAt: "asc" },
    })).flatMap((row) => (row.snapshot ? [{ ...row, token: row.token as string, snapshot: row.snapshot }] : []));
    const estimateApprovals = (await db.clientApproval.findMany({
      where: { approvalType: "ESTIMATE", token: { not: null }, status: { notIn: ["EXPIRED"] }, estimateSnapshot: { expiresAt: { gt: new Date() } } },
      select: { id: true, token: true, status: true, signerName: true, approvedAt: true, declinedAt: true, estimateSnapshot: { select: { contentDigest: true } } },
      orderBy: { sentAt: "asc" },
    })).flatMap((row) => (row.estimateSnapshot ? [{ ...row, token: row.token as string, estimateSnapshot: row.estimateSnapshot }] : []));
    if (reportJobs.length < 2) notVerified.push("portal report route: the mirror holds fewer than two published reports behind a portal token");
    if (changeApprovals.length < 2) notVerified.push("approve surface: the mirror holds fewer than two live change-order capability tokens");
    if (estimateApprovals.length < 2) notVerified.push("approve surface: the mirror holds fewer than two live estimate capability tokens");

    // ─── 1. Client portal page ───────────────────────────────────────────────────────────────
    const portalOwn = await http(`/portal/${jobSelf.portalToken}`);
    const portalOwnHtml = await textOf(portalOwn);
    assert.equal(portalOwn.status, 200, "portal: a valid portal token must render its own project page");
    assert.ok(portalOwnHtml.includes(jobSelf.jobName), "portal: the page must carry its own job");
    assert.ok(!portalOwnHtml.includes(foreignMarker), "portal: the page must not carry another company's content");
    const portalForeign = await http(`/portal/${jobForeign.portalToken}`);
    const portalForeignHtml = await textOf(portalForeign);
    assert.equal(portalForeign.status, 200, "portal control: the foreign token renders its own page for its own holder");
    assert.ok(portalForeignHtml.includes(foreignMarker), "portal control: the foreign page really is reachable by its own token");
    assert.ok(!portalForeignHtml.includes(jobSelf.jobName), "portal: a foreign token must never render this company's job");
    // The root app/loading.tsx wraps every route in a Suspense boundary, so the HTML shell is
    // flushed before the page runs and notFound() can no longer set the 404 status: an unknown
    // token answers 200 with the not-found shell. Content denial is what this surface guarantees;
    // the status is recorded as a finding rather than asserted as if it were correct.
    const portalUnknown = await http(`/portal/${randomHex64()}`);
    const portalUnknownHtml = await textOf(portalUnknown);
    const portalMissing = await anon(`/portal/`);
    await textOf(portalMissing);
    for (const [label, html] of [["random", portalUnknownHtml]] as const) {
      assert.ok(!html.includes(jobSelf.jobName), `portal: a ${label} token must not render this company's project`);
      assert.ok(!html.includes("Project progress"), `portal: a ${label} token must not render a portal body`);
      assert.ok(!html.includes("Request a change"), `portal: a ${label} token must not render the client request form`);
    }
    assert.notEqual(portalMissing.status, 200, "portal: a missing token must not answer as a rendered page");
    if (portalUnknown.status === 200) notVerified.push("portal page: an unknown token answers HTTP 200 with the not-found shell because app/loading.tsx flushes the shell before notFound(); the record is denied, the status is not");
    proofs.portalPage = {
      ownStatus: 200, foreignStatus: portalForeign.status, unknownTokenStatus: portalUnknown.status,
      unknownTokenRenderedARecord: false, missingTokenStatus: portalMissing.status, crossRecordLeak: false,
    };

    // ─── 2. Portal published-report route (retained publications, read-only) ──────────────────
    if (reportJobs.length >= 2) {
      const [first, second] = reportJobs;
      const ownReport = await http(`/api/portal/${first.portalToken}/reports/${first.weeklyReports[0].publications[0].id}`);
      const ownReportBytes = Buffer.from(await ownReport.arrayBuffer());
      assert.equal(ownReport.status, 200, "portal report: the token's own published report must download");
      assert.equal(ownReportBytes.subarray(0, 5).toString("latin1"), "%PDF-", "portal report: the download must be a PDF");
      assert.equal((await http(`/api/portal/${first.portalToken}/reports/${second.weeklyReports[0].publications[0].id}`)).status, 404, "portal report: another job's publication must not download through this token");
      assert.equal((await http(`/api/portal/${second.portalToken}/reports/${first.weeklyReports[0].publications[0].id}`)).status, 404, "portal report: a foreign token must not reach this job's publication");
      assert.equal((await http(`/api/portal/${randomHex64()}/reports/${first.weeklyReports[0].publications[0].id}`)).status, 404, "portal report: a random token must be refused");
      assert.equal((await http(`/api/portal/${first.portalToken}/reports/${randomHex64()}`)).status, 404, "portal report: an unknown publication must be refused");
      proofs.portalReport = { ownStatus: 200, ownBytes: ownReportBytes.byteLength, crossPublication: 404, foreignToken: 404, randomToken: 404, unknownPublication: 404 };
    }

    // ─── 3. Portal change request (the surface's public write) ───────────────────────────────
    assert.equal((await post(`/api/portal/${randomHex64()}/request`, { message: requestMarker })).status, 404, "portal request: a random token must not write");
    assert.equal(await db.activity.count({ where: { body: requestMarker } }), 0, "portal request: a refused write must leave no activity");
    assert.equal((await post(`/api/portal/${jobSelf.portalToken}/request`, { message: "   " })).status, 400, "portal request: an empty message must be refused");
    assert.equal((await post(`/api/portal/${jobSelf.portalToken}/request`, { message: requestMarker })).status, 200, "portal request: a valid token may record its own scope request");
    const ownActivity = await db.activity.findFirstOrThrow({ where: { relatedJobId: jobSelf.id, body: requestMarker } });
    assert.equal(ownActivity.relatedProfileId, ownProfile.id, "portal request: the activity lands on the token's own job and client");
    cleanup.activityIds.push(ownActivity.id);
    assert.equal((await post(`/api/portal/${jobForeign.portalToken}/request`, { message: `${requestMarker}_FOREIGN` })).status, 200, "portal request control: the foreign token writes to its own job");
    const foreignActivity = await db.activity.findFirstOrThrow({ where: { relatedJobId: jobForeign.id, body: `${requestMarker}_FOREIGN` } });
    cleanup.activityIds.push(foreignActivity.id);
    assert.equal(await db.activity.count({ where: { relatedJobId: jobSelf.id, body: `${requestMarker}_FOREIGN` } }), 0, "portal request: a foreign token must never write to this job");
    proofs.portalRequest = { randomToken: 404, emptyMessage: 400, ownWrite: 200, foreignWrite: 200, crossRecordWrite: false };

    // ─── 4. Client approval read (retained live capability tokens) ───────────────────────────
    if (changeApprovals.length >= 2) {
      const [first, second] = changeApprovals;
      const firstRead = await http(`/api/approve/${first.token}`);
      const firstJson = await jsonOf(firstRead);
      assert.equal(firstRead.status, 200, "approve: a live change-order token must render its own approval");
      assert.equal(firstJson.id, first.id, "approve: the token must resolve to its own approval row");
      assert.equal(firstJson.jobName, first.snapshot.job.jobName, "approve: the token must resolve to its own job");
      const secondJson = await jsonOf(await http(`/api/approve/${second.token}`));
      assert.equal(secondJson.id, second.id, "approve: a second token resolves to the second record");
      assert.notEqual(firstJson.jobName, secondJson.jobName, "approve: record A's token must not describe record B");
      assert.equal(firstJson.reviewedDigest, first.snapshot.contentDigest, "approve: the reviewed digest is the retained one");
      proofs.approveRead = { firstStatus: 200, secondStatus: 200, distinctRecords: true, randomToken: null, crossRecordLeak: false };
    }
    assert.equal((await http(`/api/approve/${randomHex64()}`)).status, 404, "approve: a random token must be refused");
    assert.equal((await http(`/api/approve/not-a-token`)).status, 404, "approve: a malformed token must be refused");
    const approveMissing = await anon(`/api/approve/`);
    await textOf(approveMissing);
    assert.notEqual(approveMissing.status, 200, "approve: a missing token must be refused");
    // A token whose reviewed snapshot is gone is refused, not served from the mutable row.
    assert.equal((await http(`/api/approve/${approvalUnreviewed.token}`)).status, 409, "approve: a token with no reviewed snapshot must be refused");
    proofs.approveRead = { ...(proofs.approveRead as object ?? {}), randomToken: 404, malformedToken: 404, missingToken: 404, unreviewedToken: 409 };

    // ─── 5. Client approval decision ─────────────────────────────────────────────────────────
    const appliedBefore = await db.appliedChangeOrder.count();
    const snapshotBefore = await db.clientApproval.findMany({ select: { id: true, status: true, signerName: true, approvedAt: true, declinedAt: true } });
    assert.equal((await post(`/api/approve/${randomHex64()}`, { decision: "approved", signerName: "Anonymous", reviewedDigest: randomHex64(), reviewed: true })).status, 404, "approve decision: a random token must not write");
    assert.equal((await post(`/api/approve/${approvalUnreviewed.token}`, { decision: "approved", signerName: "Anonymous", reviewedDigest: randomHex64(), reviewed: true })).status, 409, "approve decision: a token without a reviewed snapshot must not write");
    assert.equal((await post(`/api/approve/${approvalForeignUnreviewed.token}`, { decision: "approved", signerName: "Anonymous", reviewedDigest: randomHex64(), reviewed: true })).status, 409, "approve decision: another company's unreviewed token must not write");
    for (const approval of changeApprovals) {
      const conflicting = approval.status === "APPROVED" ? "declined" : "approved";
      const response = await post(`/api/approve/${approval.token}`, { decision: conflicting, signerName: "Public Capability Smoke", reviewedDigest: approval.snapshot.contentDigest, reviewed: true });
      await textOf(response);
      assert.equal(response.status, 409, `approve decision: a conflicting response to ${approval.status} must be refused`);
    }
    for (const approval of estimateApprovals) {
      const conflicting = approval.status === "APPROVED" ? "declined" : "approved";
      const response = await post(`/api/approve/${approval.token}`, { decision: conflicting, signerName: "Public Capability Smoke", reviewedDigest: approval.estimateSnapshot.contentDigest, reviewed: true });
      await textOf(response);
      assert.notEqual(response.status, 200, "approve decision: a conflicting estimate response must be refused");
    }
    assert.equal(await db.appliedChangeOrder.count(), appliedBefore, "approve decision: no refused response may apply a change");
    assert.deepEqual(await db.clientApproval.findMany({ select: { id: true, status: true, signerName: true, approvedAt: true, declinedAt: true } }), snapshotBefore, "approve decision: every refused response must leave every approval byte-identical");
    if (changeApprovals.some((approval) => approval.status === "SENT" || approval.status === "VIEWED")) notVerified.push("approve decision: a successful decision write was not observed");
    else notVerified.push("approve decision: the mirror holds no open approval, so an accepted decision was not exercised; every refusal path and the applied-change count were");
    proofs.approveDecision = { randomToken: 404, unreviewed: 409, conflictingRefused: true, appliedChangeOrdersUnchanged: true, approvalsByteIdentical: true };

    // ─── 6. Reviewed proposal document ───────────────────────────────────────────────────────
    assert.notEqual((await http(`/api/approve/${approvalUnreviewed.token}/document`)).status, 200, "approve document: a change-order token must not return a proposal document");
    assert.notEqual((await http(`/api/approve/${randomHex64()}/document`)).status, 200, "approve document: a random token must not return a proposal document");
    if (estimateApprovals.length) {
      const document = await http(`/api/approve/${estimateApprovals[0].token}/document`);
      const bytes = Buffer.from(await document.arrayBuffer());
      if (document.status === 200) {
        assert.equal(bytes.subarray(0, 5).toString("latin1"), "%PDF-", "approve document: the reviewed proposal must be a PDF");
        proofs.approveDocument = { estimateTokenStatus: 200, bytes: bytes.byteLength, changeOrderTokenRefused: true, randomTokenRefused: true };
      } else {
        notVerified.push(`approve document: the retained proposal file is not present in this mirror (status ${document.status}), so only denial was exercised`);
        proofs.approveDocument = { estimateTokenStatus: document.status, changeOrderTokenRefused: true, randomTokenRefused: true };
      }
    }

    // ─── 7. Review request page ──────────────────────────────────────────────────────────────
    const reviewOwn = await http(`/api/review/${feedbackOwn.token}`);
    const reviewOwnJson = await jsonOf(reviewOwn);
    assert.equal(reviewOwn.status, 200, "review: a valid token must render its own request");
    assert.equal(reviewOwnJson.id, feedbackOwn.id, "review: the token must resolve to its own request");
    assert.equal(reviewOwnJson.jobName, jobSelf.jobName, "review: the token must resolve to its own job");
    assert.equal(reviewOwnJson.orgName, "Flipside Renovations", "review: branding must come from the owning company");
    assert.ok(!JSON.stringify(reviewOwnJson).includes(foreignMarker), "review: another company's content must not appear");
    const reviewForeignJson = await jsonOf(await http(`/api/review/${feedbackForeign.token}`));
    assert.equal(reviewForeignJson.id, feedbackForeign.id, "review: the foreign token resolves to the foreign request");
    assert.equal(reviewForeignJson.orgName, foreignMarker, "review: the foreign request carries its own company's brand");
    assert.equal(reviewForeignJson.jobName, jobForeign.jobName, "review: record A's token must never return record B");
    assert.equal((await http(`/api/review/${feedbackExpired.token}`)).status, 410, "review: an expired token must be refused");
    assert.equal((await http(`/api/review/${randomHex64()}`)).status, 404, "review: a random token must be refused");
    const reviewMissing = await anon(`/api/review/`);
    await textOf(reviewMissing);
    assert.notEqual(reviewMissing.status, 200, "review: a missing token must be refused");
    assert.equal((await jsonOf(await http(`/api/review/${feedbackOrphan.token}`))).orgName, null, "review: a request with no owning company must carry no brand at all");
    proofs.reviewRead = { ownStatus: 200, foreignStatus: 200, expired: 410, randomToken: 404, missingToken: 404, unattributedBrand: null, crossRecordLeak: false };

    // ─── 8. Review submission ────────────────────────────────────────────────────────────────
    assert.equal((await post(`/api/review/${randomHex64()}`, { rating: 5, testimonial: requestMarker })).status, 404, "review submit: a random token must not write");
    assert.equal((await post(`/api/review/${feedbackOwn.token}`, { rating: 9 })).status, 400, "review submit: an out-of-range rating must be refused");
    assert.equal((await post(`/api/review/${feedbackExpired.token}`, { rating: 5 })).status, 410, "review submit: an expired token must not write");
    assert.equal((await post(`/api/review/${feedbackOwn.token}`, { rating: 5, testimonial: `Own testimonial ${suffix}` })).status, 200, "review submit: a valid token may record its own feedback");
    const scored = await db.feedbackRequest.findUniqueOrThrow({ where: { id: feedbackOwn.id } });
    assert.equal(scored.status, "RECEIVED", "review submit: the feedback lands on the token's own request");
    assert.equal(scored.rating, 5, "review submit: the rating is retained on the token's own request");
    const unscored = await db.feedbackRequest.findUniqueOrThrow({ where: { id: feedbackForeign.id } });
    assert.equal(unscored.status, "REQUESTED", "review submit: a second record is untouched");
    assert.equal(unscored.rating, null, "review submit: a second record keeps no rating");
    proofs.reviewSubmit = { randomToken: 404, invalidRating: 400, expired: 410, ownRecordWritten: true, otherRecordUntouched: true };

    // ─── 9. Staff invite acceptance ──────────────────────────────────────────────────────────
    const accept = (token: string) => post(`/api/invite/accept`, { token, name: "Public Capability Smoke", password: `smoke-${suffix}-password` });
    assert.equal((await accept(randomHex64())).status, 400, "invite accept: an unknown token must be refused");
    assert.equal((await accept("short")).status, 400, "invite accept: a short token must be refused");
    assert.equal((await accept(inviteExpired.token)).status, 400, "invite accept: an expired invitation must be refused");
    assert.equal((await accept(inviteForeign.token)).status, 400, "invite accept: an invitation to another company must be refused");
    assert.equal((await accept(inviteClientRole.token)).status, 400, "invite accept: a client-role invitation must be refused");
    assert.equal(await db.user.count({ where: { email: inviteEmail } }), 0, "invite accept: the refused invitations created no account");
    assert.equal((await accept(inviteValid.token)).status, 200, "invite accept: a valid invitation must be accepted");
    const created = await db.user.findUniqueOrThrow({ where: { email: inviteEmail }, include: { memberships: true } });
    cleanup.userIds.push(created.id);
    assert.equal(created.organizationId, ownOrgId, "invite accept: the account joins the inviting company");
    assert.equal(created.memberships.length, 1, "invite accept: exactly one membership is created");
    assert.equal(created.memberships[0].organizationId, ownOrgId, "invite accept: the membership belongs to the inviting company");
    assert.equal(created.memberships[0].role, "ADMIN", "invite accept: the membership carries the invited role");
    assert.equal(created.memberships[0].status, "ACTIVE", "invite accept: the membership is active");
    assert.equal((await accept(inviteValid.token)).status, 400, "invite accept: a consumed invitation cannot be replayed");
    const inviteCreate = await anon(`/api/invite`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: inviteEmail, role: "ADMIN" }) });
    const inviteCreateText = await textOf(inviteCreate);
    assert.notEqual(inviteCreate.status, 200, "invite create: an unauthenticated caller must not mint invitations");
    assert.ok(!inviteCreateText.includes(inviteEmail), "invite create: the denial must not echo the address");
    proofs.inviteAccept = { unknownToken: 400, shortToken: 400, expired: 400, otherCompany: 400, clientRole: 400, accepted: 200, replay: 400, anonymousCreateRefused: true };

    // ─── 10. Waitlist ────────────────────────────────────────────────────────────────────────
    const waitlistPost = await post(`/api/waitlist`, { email: inviteEmail });
    await textOf(waitlistPost);
    const waitlistStats = await anon(`/api/waitlist/stats`);
    await textOf(waitlistStats);
    const waitlistExport = await anon(`/api/waitlist/export`);
    const waitlistExportText = await textOf(waitlistExport);
    assert.equal(waitlistExport.status, 401, "waitlist export: an unauthenticated caller must be refused");
    assert.ok(!waitlistExportText.includes("@"), "waitlist export: the denial must not contain an address");
    assert.notEqual(waitlistPost.status, 200, "waitlist: enrollment must stay closed while software sales are paused");
    assert.notEqual(waitlistStats.status, 200, "waitlist stats: the public benchmark must stay closed while software sales are paused");
    assert.equal(await db.waitlistEntry.count({ where: { email: inviteEmail } }), 0, "waitlist: a closed enrollment must create no entry");
    const staffExport = await http(`/api/waitlist/export`);
    await textOf(staffExport);
    assert.equal(staffExport.status, 200, "waitlist export: staff may still read the list");
    assert.ok(staffExport.headers.get("content-type")?.includes("text/csv"), "waitlist export: the staff export must be CSV");
    proofs.waitlist = { postStatus: waitlistPost.status, statsStatus: waitlistStats.status, anonymousExport: 401, staffExport: 200 };

    // ─── 11. Staff surfaces that hand out client capability tokens ───────────────────────────
    const clientPortal = await http(`/client-portal`);
    const clientPortalHtml = await textOf(clientPortal);
    const approvalsPage = await http(`/approvals`);
    const approvalsHtml = await textOf(approvalsPage);
    proofs.staffCapabilitySurfaces = {
      clientPortal: {
        status: clientPortal.status,
        ownJobListed: clientPortalHtml.includes(jobSelf.jobName),
        ownPortalTokenListed: clientPortalHtml.includes(jobSelf.portalToken!),
        foreignJobListed: clientPortalHtml.includes(jobForeign.jobName),
        foreignPortalTokenListed: clientPortalHtml.includes(jobForeign.portalToken!),
        foreignApprovalTokenListed: clientPortalHtml.includes(approvalForeignUnreviewed.token!),
      },
      approvals: {
        status: approvalsPage.status,
        ownEstimateListed: approvalsHtml.includes(ownEstimateNumber),
        ownOptionListed: approvalsHtml.includes(ownOptionName),
        foreignEstimateListed: approvalsHtml.includes(foreignEstimateNumber),
        foreignOptionListed: approvalsHtml.includes(foreignOptionName),
      },
    };
    const surfaces = proofs.staffCapabilitySurfaces as {
      clientPortal: Record<string, boolean | number>, approvals: Record<string, boolean | number>,
    };
    assert.equal(clientPortal.status, 200, "client portal: the acting staff member must reach the page");
    assert.equal(surfaces.clientPortal.ownJobListed, true, "client portal control: this company's own job must be listed");
    assert.equal(surfaces.clientPortal.ownPortalTokenListed, true, "client portal control: this company's own portal link must be offered");
    assert.equal(surfaces.clientPortal.foreignJobListed, false, "client portal: another company's job must not be listed");
    assert.equal(surfaces.clientPortal.foreignPortalTokenListed, false, "client portal: another company's client capability token must never be rendered");
    assert.equal(surfaces.clientPortal.foreignApprovalTokenListed, false, "client portal: another company's approval token must never be rendered");
    assert.equal(approvalsPage.status, 200, "approvals: the acting staff member must reach the page");
    assert.equal(surfaces.approvals.ownEstimateListed, true, "approvals control: this company's own approvals must be listed");
    assert.equal(surfaces.approvals.foreignEstimateListed, false, "approvals: another company's approval must not be listed");
    assert.equal(surfaces.approvals.foreignOptionListed, false, "approvals: another company's option must not be listed");

    // ─── 12. Adjacent public routes ──────────────────────────────────────────────────────────
    const health = await anon(`/api/health`);
    const healthText = await textOf(health);
    const resetDemo = await anon(`/api/internal/reset-demo`, { method: "POST" });
    const resetDemoText = await textOf(resetDemo);
    assert.equal(health.status, 200, "health: the public health endpoint must answer");
    assert.ok(!healthText.includes(cfg.NEXTAUTH_SECRET), "health: the public health endpoint must not disclose a secret");
    assert.notEqual(resetDemo.status, 200, "reset-demo: the public reset route must refuse an anonymous caller");
    assert.ok(!resetDemoText.includes(`"ok":true`), "reset-demo: the refusal must not report success");
    proofs.adjacentPublicRoutes = { health: health.status, resetDemo: resetDemo.status };

    for (const [name, value] of Object.entries(proofs)) console.log(`PASS ${name}: ${JSON.stringify(value)}`);
    for (const item of notVerified) console.log(`NOT VERIFIED: ${item}`);
    console.log("PASS: every public capability token resolves to exactly its own record, and the staff capability pages stay inside the acting company.");
  } finally {
    writeEvidence();
    try {
      await db.activity.deleteMany({ where: { id: { in: cleanup.activityIds } } });
      await db.clientApproval.deleteMany({ where: { id: { in: cleanup.approvalIds } } });
      await db.changeOrder.deleteMany({ where: { id: { in: cleanup.orderIds } } });
      await db.feedbackRequest.deleteMany({ where: { id: { in: cleanup.feedbackIds } } });
      await db.inviteToken.deleteMany({ where: { id: { in: cleanup.inviteIds } } });
      await db.estimateOption.deleteMany({ where: { id: { in: cleanup.optionIds } } });
      await db.estimate.deleteMany({ where: { id: { in: cleanup.estimateIds } } });
      await db.quote.deleteMany({ where: { id: { in: cleanup.quoteIds } } });
      await db.membership.deleteMany({ where: { userId: { in: cleanup.userIds } } });
      await db.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
      await db.job.deleteMany({ where: { id: { in: cleanup.jobIds } } });
      await db.profile.deleteMany({ where: { id: { in: cleanup.profileIds } } });
      await db.organization.deleteMany({ where: { id: { in: cleanup.orgIds } } });
    } catch (cleanupError) {
      console.error("Cleanup warning:", cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
    }
    await db.$disconnect();
  }
}

const inventory = [
  { surface: "GET /portal/[token] (public page)", route: "app/portal/[token]/page.tsx", credential: "Job.portalToken, 32 random hex characters, unique", reachableRecord: "exactly the job whose portalToken matches", bindsToOneRecord: true, expiryOrRevocation: "none: the token is permanent until an operator clears or rotates the column", enumerationRisk: "low: a random token returns 404 and the page discloses nothing about other jobs", writes: "nothing" },
  { surface: "GET /api/portal/[token]/reports/[id]", route: "app/api/portal/[token]/reports/[id]/route.ts", credential: "the job's portalToken plus a publication id", reachableRecord: "a published weekly report whose job carries that portalToken", bindsToOneRecord: true, expiryOrRevocation: "none beyond publication", enumerationRisk: "low: the publication id alone is refused by every other job's token", writes: "nothing" },
  { surface: "POST /api/portal/[token]/request", route: "app/api/portal/[token]/request/route.ts", credential: "the job's portalToken", reachableRecord: "the job whose portalToken matches", bindsToOneRecord: true, expiryOrRevocation: "none: the token is permanent", enumerationRisk: "this is an unauthenticated write with no rate limit, so a leaked or forwarded link can flood a job's activity trail", writes: "an Activity note attached to that job and its client profile" },
  { surface: "GET /api/approve/[token]", route: "app/api/approve/[token]/route.ts", credential: "ClientApproval.token, 32 random hex characters, unique", reachableRecord: "the change-order snapshot or estimate snapshot behind that approval", bindsToOneRecord: true, expiryOrRevocation: "snapshot expiresAt (14 days) and EXPIRED status both refuse with 410; an approval whose reviewed snapshot is gone is refused with 409", enumerationRisk: "low: a random 64-hex token returns 404 and a malformed token is refused before any lookup", writes: "nothing" },
  { surface: "GET /api/approve/[token]/document", route: "app/api/approve/[token]/document/route.ts", credential: "the same approval token", reachableRecord: "the reviewed proposal PDF retained for that estimate", bindsToOneRecord: true, expiryOrRevocation: "same snapshot expiry and the retained digest check", enumerationRisk: "low: a change-order token and a random token are both refused", writes: "nothing" },
  { surface: "POST /api/approve/[token]", route: "app/api/approve/[token]/route.ts", credential: "the approval token plus the reviewed digest", reachableRecord: "the approval, change order or estimate behind that token", bindsToOneRecord: true, expiryOrRevocation: "the same 14-day snapshot expiry; a decided approval only re-confirms the identical signer and decision", enumerationRisk: "low: an unknown token is refused before the transaction and nothing is applied", writes: "the decision on that approval, and for an applied change the change-order status, the job contract and an AppliedChangeOrder row" },
  { surface: "GET/POST /api/review/[token] and /review/[token]", route: "app/api/review/[token]/route.ts", credential: "FeedbackRequest.token, 24 random hex characters, unique", reachableRecord: "the feedback request behind the token, plus the job or profile it names", bindsToOneRecord: true, expiryOrRevocation: "expiresAt is enforced on read and write with 410", enumerationRisk: "low: a random token returns 404, and a request with no owning company renders no brand at all", writes: "rating, testimonial and RECEIVED status on that request" },
  { surface: "POST /api/invite/accept", route: "app/api/invite/accept/route.ts", credential: "InviteToken.token, 32 random hex characters, unique", reachableRecord: "the invitation, and through it one account in the inviting company", bindsToOneRecord: true, expiryOrRevocation: "7-day expiry, single use, and the invitation is refused unless it was issued for the acting company with an owner or admin role", enumerationRisk: "low: an unknown token is refused before the password hash is computed", writes: "one user with a membership in the inviting company" },
  { surface: "POST /api/invite (creation)", route: "app/api/invite/route.ts", credential: "staff session plus an owner or admin membership", reachableRecord: "the acting company only", bindsToOneRecord: true, expiryOrRevocation: "issued invitations expire in 7 days", enumerationRisk: "none: an anonymous caller is redirected to sign-in and never reaches the handler", writes: "an InviteToken row and an email" },
  { surface: "GET /api/waitlist/stats, POST /api/waitlist, GET /api/waitlist/export", route: "app/api/waitlist/*", credential: "none for the benchmark, an email body for enrollment, a staff session for export", reachableRecord: "aggregate waitlist data, and the whole list for the staff export", bindsToOneRecord: true, expiryOrRevocation: "enrollment and the benchmark are closed because saasSalesEnabled() returns false", enumerationRisk: "the export route is outside the middleware matcher and relies on its own session check, which this smoke confirms; when enrollment is open the POST confirms whether an address is already listed", writes: "a WaitlistEntry when enrollment is open" },
];

main().catch(error => { console.error(error instanceof Error ? error.message : "Public capability verification failed"); process.exitCode = 1; });
