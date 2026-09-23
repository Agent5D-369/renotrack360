import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { prisma } from "../lib/prisma";
import { FLIPSIDE_NAME } from "../lib/flipside-brand";
import { DEFAULT_ORG_ID } from "../lib/constants";
import { GET as reviewGet } from "../app/api/review/[token]/route";

const own = "token-surface-own";
const foreign = "token-surface-foreign";
const ids = {
  ownProfile: "token-surface-own-profile",
  foreignProfile: "token-surface-foreign-profile",
  ownJob: "token-surface-own-job",
  foreignJob: "token-surface-foreign-job",
};
const token = (suffix: string) => suffix.padEnd(64, "0");
const tokens = {
  jobOwned: token("a1"),
  profileOnly: token("b2"),
  ownerless: token("c3"),
  jobForeign: token("d4"),
};

const call = async (value: string) => {
  const response = await reviewGet(new Request(`http://localhost/api/review/${value}`), {
    params: Promise.resolve({ token: value }),
  });
  return { status: response.status, body: await response.json() as Record<string, unknown> };
};

before(async () => {
  await prisma.organization.createMany({ data: [
    // The platform default company is seeded deliberately: the removed fallback read this row, so an
    // ownerless link would have shown this brand to the client. Without the row present the old
    // fallback would have resolved to nothing and the assertions below could not tell the two
    // implementations apart.
    { id: DEFAULT_ORG_ID, name: FLIPSIDE_NAME, logoUrl: "/brand/flipside-original.png", brandColor: "#171717", reviewLink: "https://reviews.example.test/flipside" },
    { id: own, name: "Owned Brand Co", logoUrl: "/brand/owned.png", brandColor: "#123456", companyTagline: "Owned tagline", reviewLink: "https://reviews.example.test/owned" },
    { id: foreign, name: "Foreign Brand Co", logoUrl: "/brand/foreign.png", brandColor: "#654321", companyTagline: "Foreign tagline", reviewLink: "https://reviews.example.test/foreign" },
  ] });
  await prisma.profile.createMany({ data: [
    { id: ids.ownProfile, organizationId: own, profileName: "Owned client", profileType: "HOMEOWNER" },
    { id: ids.foreignProfile, organizationId: foreign, profileName: "Foreign client", profileType: "HOMEOWNER" },
  ] });
  await prisma.job.createMany({ data: [
    { id: ids.ownJob, organizationId: own, jobName: "Owned review job", clientProfileId: ids.ownProfile },
    { id: ids.foreignJob, organizationId: foreign, jobName: "Foreign review job", clientProfileId: ids.foreignProfile },
  ] });
  await prisma.feedbackRequest.createMany({ data: [
    { id: "token-surface-job-owned", token: tokens.jobOwned, jobId: ids.ownJob, profileId: ids.ownProfile, requestType: "CLOSEOUT" },
    { id: "token-surface-profile-only", token: tokens.profileOnly, profileId: ids.ownProfile, requestType: "CLOSEOUT" },
    { id: "token-surface-ownerless", token: tokens.ownerless, requestType: "CLOSEOUT" },
    { id: "token-surface-job-foreign", token: tokens.jobForeign, jobId: ids.foreignJob, profileId: ids.foreignProfile, requestType: "CLOSEOUT" },
  ] });
});

after(async () => { await prisma.$disconnect(); });

test("a review link carries the brand of the company that owns the record", async () => {
  const owned = await call(tokens.jobOwned);
  assert.equal(owned.status, 200);
  assert.equal(owned.body.orgName, "Owned Brand Co");
  assert.equal(owned.body.orgLogoUrl, "/brand/owned.png");
  assert.equal(owned.body.orgBrandColor, "#123456");
  assert.equal(owned.body.orgTagline, "Owned tagline");
  assert.equal(owned.body.reviewLink, "https://reviews.example.test/owned");

  const other = await call(tokens.jobForeign);
  assert.equal(other.body.orgName, "Foreign Brand Co");
  assert.equal(other.body.orgBrandColor, "#654321");
  assert.notEqual(other.body.orgName, FLIPSIDE_NAME);
});

test("a review link with no job resolves its brand from the client profile, not the platform default", async () => {
  const { status, body } = await call(tokens.profileOnly);
  assert.equal(status, 200);
  assert.equal(body.orgName, "Owned Brand Co");
  assert.equal(body.orgLogoUrl, "/brand/owned.png");
  assert.equal(body.reviewLink, "https://reviews.example.test/owned");
});

test("a review link whose owner cannot be established carries no brand rather than someone else's", async () => {
  const { status, body } = await call(tokens.ownerless);
  assert.equal(status, 200);
  // The default company exists in this database, so a surviving fallback to it would answer here with
  // "Flipside Renovations" and a real review link.
  assert.equal(await prisma.organization.count({ where: { id: DEFAULT_ORG_ID } }), 1);
  assert.equal(body.orgName, null);
  assert.equal(body.orgLogoUrl, null);
  assert.equal(body.orgBrandColor, null);
  assert.equal(body.orgTagline, null);
  assert.equal(body.reviewLink, null);
  assert.notEqual(body.orgName, FLIPSIDE_NAME);
  assert.equal(JSON.stringify(body).includes(FLIPSIDE_NAME), false);
});
