import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

async function main() {
  const cfg = JSON.parse(readFileSync(".preservation/media-http-env.json", "utf8"));
  const target = new URL(cfg.DATABASE_URL);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/flipside_restore_media_v2");
  const origin = "http://localhost:3010";
  const db = new PrismaClient({ datasources: { db: { url: cfg.DATABASE_URL } }, log: [] });
  const suffix = randomUUID();
  const marker = `FOREIGN_CRM_${suffix}`;
  try {
    const owner = await db.user.findUniqueOrThrow({ where: { id: "report-wave-local-owner" } });
    const org = await db.organization.create({ data: { name: "Synthetic isolated CRM company" } });
    const profile = await db.profile.create({ data: { organizationId: org.id, profileName: marker, profileType: "HOMEOWNER" } });
    const own = await db.profile.create({ data: { organizationId: "flipside-org", profileName: `Own CRM ${suffix}`, profileType: "HOMEOWNER" } });
    const property = await db.property.create({ data: { organizationId: org.id, propertyAddress: marker, city: "Austin", state: "TX", zip: "78704", propertyType: "SINGLE_FAMILY_HOME" } });
    const lead = await db.lead.create({ data: { organizationId: org.id, leadName: marker, relatedProfileId: profile.id, relatedPropertyId: property.id } });
    const quote = await db.quote.create({ data: { organizationId: org.id, quoteName: marker, clientProfileId: profile.id, propertyId: property.id, leadId: lead.id } });
    const estimate = await db.estimate.create({ data: { quoteId: quote.id, estimateNumber: marker, clientProfileId: profile.id, propertyId: property.id } });
    const activity = await db.activity.create({ data: { subject: marker, relatedProfileId: profile.id } });
    const mixed = await db.activity.create({ data: { subject: marker + "_MIXED", relatedProfileId: own.id, relatedQuoteId: quote.id } });
    const cookie = "next-auth.session-token=" + await encode({ secret: cfg.NEXTAUTH_SECRET, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (path: string, init: RequestInit = {}) => fetch(origin + path, { ...init, redirect: "manual", headers: { ...init.headers, cookie } });
    const records = [["profiles", profile.id], ["properties", property.id], ["leads", lead.id], ["quotes", quote.id], ["estimates", estimate.id], ["activities", activity.id]];
    for (const [route, id] of records) {
      const list = await http(`/${route}`);
      assert.equal(list.status, 200, route);
      assert.ok(!(await list.text()).includes(marker), `${route} must exclude foreign and mixed records`);
      const detail = await http(`/${route}/${id}`);
      const html = await detail.text();
      assert.ok(detail.status === 404 || html.includes("NEXT_HTTP_ERROR_FALLBACK;404"), `${route} foreign detail must be not found`);
      assert.ok(!html.includes(marker), `${route} foreign detail must not disclose its content`);
    }
    const mixedDetail = await http(`/activities/${mixed.id}`);
    const mixedHtml = await mixedDetail.text();
    assert.ok(mixedDetail.status === 404 || mixedHtml.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
    assert.ok(!mixedHtml.includes(marker));
    for (const route of ["/profiles/new", "/properties/new", "/leads/new", "/quotes/new", "/quotes/field-wizard", "/activities/new"]) {
      const response = await http(route);
      assert.equal(response.status, 200, route);
      assert.ok(!(await response.text()).includes(marker), `${route} options must exclude foreign records`);
    }
    const ownPage = await http(`/profiles/${own.id}`);
    assert.equal(ownPage.status, 200);
    assert.ok((await ownPage.text()).includes(own.profileName));

    const formHtml = await (await http("/profiles/new")).text();
    const profileCreateForm = formHtml.match(/<form\b[\s\S]*?<\/form>/g)?.find(form => form.includes('name="profileName"'));
    assert.ok(profileCreateForm, "Profile create form must be available for real submission testing");
    const actionManifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")) as { node: Record<string, { exportedName?: string }> };
    const profileActionId = Object.entries(actionManifest.node).find(([, reference]) => reference.exportedName === "createProfile")?.[0];
    assert.ok(profileActionId, "Built server action manifest must expose createProfile");
    const profileForm = (name: string, companyProfileId: string) => {
      const form = new FormData();
      for (const [key, value] of Object.entries({ [`$ACTION_ID_${profileActionId}`]: "", profileName: name, profileKind: "PERSON", profileType: "HOMEOWNER", clientStatus: "PROSPECT", companyProfileId, relationshipStrength: "50", trustLevel: "50", leadPotential: "50", referralPotential: "50", w9Status: "NOT_REQUIRED", vendorOnboardingStatus: "NOT_STARTED" })) form.set(key, value);
      return form;
    };
    const deniedName = `Denied CRM ${suffix}`;
    const denied = await http("/profiles/new", { method: "POST", headers: { origin }, body: profileForm(deniedName, profile.id) });
    await denied.text();
    assert.ok(denied.status >= 400, `Foreign relationship submission must be rejected, received ${denied.status}`);
    assert.equal(await db.profile.count({ where: { profileName: deniedName } }), 0, "Foreign relationship must fail without a write");
    const acceptedName = `Created CRM ${suffix}`;
    const accepted = await http("/profiles/new", { method: "POST", headers: { origin }, body: profileForm(acceptedName, own.id) });
    const acceptedText = await accepted.text();
    assert.equal(accepted.status, 303, `Owned relationship submission must redirect after creation: ${acceptedText.slice(0, 300)}`);
    const created = await db.profile.findFirstOrThrow({ where: { profileName: acceptedName } });
    assert.equal(created.organizationId, "flipside-org");
    assert.equal(created.companyProfileId, own.id);
    assert.equal((await db.profile.findUniqueOrThrow({ where: { id: profile.id } })).profileName, marker);

    const reverse = await db.quote.create({ data: { organizationId: org.id, quoteName: marker + "_REVERSE", clientProfileId: own.id } });
    const deletePage = await (await http(`/profiles/${own.id}`)).text();
    const deleteForm = deletePage.match(/<form\b[\s\S]*?<\/form>/g)?.find(form => form.includes("Delete contact"));
    assert.ok(deleteForm, "Owned profile must expose its bound deletion action");
    const decode = (value: string) => value.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    const deleteBody = new FormData();
    for (const tag of deleteForm.match(/<input\b[^>]*>/g) ?? []) {
      if (!tag.includes('type="hidden"')) continue;
      const name = /name="([^"]+)"/.exec(tag)?.[1];
      if (name) deleteBody.set(decode(name), decode(/value="([^"]*)"/.exec(tag)?.[1] ?? ""));
    }
    assert.ok([...deleteBody.keys()].some(key => key.startsWith("$ACTION_")));
    const beforeDelete = await db.profile.findUniqueOrThrow({ where: { id: own.id } });
    const deniedDelete = await http(`/profiles/${own.id}`, { method: "POST", headers: { origin }, body: deleteBody });
    await deniedDelete.text();
    assert.ok(deniedDelete.status >= 400, `Corrupt reverse-link deletion must be rejected, received ${deniedDelete.status}`);
    assert.deepEqual(await db.profile.findUniqueOrThrow({ where: { id: own.id } }), beforeDelete);
    assert.deepEqual(await db.quote.findUniqueOrThrow({ where: { id: reverse.id } }), reverse);

    const result = { checkedAt: new Date().toISOString(), listAndForeignDetailPairs: records.length, mixedActivityDenied: true, scopedOptionPages: 6, ownedDetailVisible: true, foreignRelationshipWriteDenied: true, foreignRelationshipStatus: denied.status, ownedRelationshipWriteSucceeded: true, ownedRelationshipStatus: accepted.status, foreignReverseLinkDeletionDenied: true, foreignReverseLinkDeletionStatus: deniedDelete.status, foreignRecordsUnchanged: true, externalCompanyAdmissionEnabled: false };
    writeFileSync(".preservation/company-scope-local-http.json", JSON.stringify(result, null, 2));
    console.log("PASS: local CRM lists, details, options and actual profile submissions enforce company boundaries.");
  } finally { await db.$disconnect(); }
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Company scope HTTP check failed"); process.exitCode = 1; });
