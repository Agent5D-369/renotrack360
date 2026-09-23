import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

async function main() {
  const cfg = JSON.parse(readFileSync(".preservation/media-http-env.json", "utf8"));
  const target = new URL(cfg.DATABASE_URL);
  assert.equal(target.hostname, "127.0.0.1", "this smoke only runs against the local retained database");
  assert.equal(target.pathname, "/flipside_restore_media_v2", "unexpected local database");
  const db = new PrismaClient({ datasources: { db: { url: cfg.DATABASE_URL } }, log: [] });
  try {
    // The retained local database predates this migration; apply it exactly as production will.
    await db.$executeRawUnsafe(`ALTER TABLE "Organization"
      ADD COLUMN IF NOT EXISTS "defaultTargetMarginPercent" DECIMAL(6,2) NOT NULL DEFAULT 40,
      ADD COLUMN IF NOT EXISTS "ownerExceptionMarginPercent" DECIMAL(6,2) NOT NULL DEFAULT 35,
      ADD COLUMN IF NOT EXISTS "changeOrderApprovalThresholdCents" INTEGER,
      ADD COLUMN IF NOT EXISTS "invoiceApprovalThresholdCents" INTEGER,
      ADD COLUMN IF NOT EXISTS "notificationCadence" TEXT NOT NULL DEFAULT 'WEEKLY',
      ADD COLUMN IF NOT EXISTS "defaultPaymentSchedule" JSONB`);

    const owner = await db.user.findUniqueOrThrow({ where: { id: "report-wave-local-owner" } });
    const organizationId = owner.organizationId!;
    const before = await db.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const cookie = "next-auth.session-token=" + await encode({
      secret: cfg.NEXTAUTH_SECRET,
      token: { id: owner.id, sub: owner.id, email: owner.email },
    });
    const origin = "http://localhost:3010";
    const http = (path: string, init: RequestInit = {}) =>
      fetch(origin + path, { ...init, redirect: "manual", headers: { ...init.headers, cookie } });

    // The page must render the company operations section from the authenticated company.
    const page = await http("/settings");
    assert.equal(page.status, 200, "/settings");
    const html = await page.text();
    assert.ok(html.includes("Company operations"), "settings page renders the company operations section");
    assert.ok(html.includes('name="ownerExceptionMarginPercent"'), "owner exception field is present");
    assert.ok(html.includes("not yet enforced by automation"), "advisory fields are labelled honestly");

    const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")) as {
      node: Record<string, { exportedName?: string }>;
    };
    const actionId = Object.entries(manifest.node).find(([, value]) => value.exportedName === "updateCompanySettings")?.[0];
    assert.ok(actionId, "updateCompanySettings action id");
    const body = new FormData();
    body.set(`$ACTION_ID_${actionId}`, "");
    body.set("defaultTargetMarginPercent", "47.5");
    body.set("ownerExceptionMarginPercent", "30");
    body.set("changeOrderApprovalThreshold", "2500");
    body.set("invoiceApprovalThreshold", "");
    body.set("notificationCadence", "BIMONTHLY");
    const save = await http("/settings", { method: "POST", headers: { origin }, body });
    await save.text();
    assert.equal(save.status, 303, "company settings save redirects on success");

    const after = await db.organization.findUniqueOrThrow({ where: { id: organizationId } });
    assert.equal(Number(after.defaultTargetMarginPercent), 47.5);
    assert.equal(Number(after.ownerExceptionMarginPercent), 30);
    assert.equal(after.changeOrderApprovalThresholdCents, 250000);
    assert.equal(after.invoiceApprovalThresholdCents, null, "a blank threshold clears rather than setting zero");
    assert.equal(after.notificationCadence, "BIMONTHLY");
    const previousMargin = Number(before.defaultTargetMarginPercent);
    assert.ok(Number.isFinite(previousMargin), "the retained company has a readable margin default");

    // A rejected submission must not write.
    const invalid = new FormData();
    invalid.set(`$ACTION_ID_${actionId}`, "");
    invalid.set("defaultTargetMarginPercent", "140");
    invalid.set("ownerExceptionMarginPercent", "30");
    invalid.set("notificationCadence", "WEEKLY");
    await (await http("/settings", { method: "POST", headers: { origin }, body: invalid })).text();
    assert.equal(Number((await db.organization.findUniqueOrThrow({ where: { id: organizationId } })).defaultTargetMarginPercent), 47.5, "an out-of-range margin is refused without a write");

    // The scenario form uses the saved company margin default rather than a hardcoded 40.
    const scenarios = await http("/cost-intelligence/scenarios");
    assert.equal(scenarios.status, 200, "/cost-intelligence/scenarios");
    const scenarioHtml = await scenarios.text();
    assert.ok(scenarioHtml.includes('name="targetMarginPercent"'), "scenario margin field present");
    assert.ok(scenarioHtml.includes('value="47.5"'), "scenario form renders the company default margin");
    assert.ok(scenarioHtml.includes("Owner exception below 30% margin"), "scenario copy uses the company exception threshold");

    // Company default payment schedule: save it through the real action, then prove it round-trips
    // and that a blank submission clears the override back to the built-in default.
    const scheduleActionId = Object.entries(manifest.node).find(([, value]) => value.exportedName === "updateDefaultPaymentSchedule")?.[0];
    assert.ok(scheduleActionId, "updateDefaultPaymentSchedule action id");
    const postSchedule = async (value: string) => {
      const body = new FormData();
      body.set(`$ACTION_ID_${scheduleActionId}`, "");
      body.set("defaultPaymentSchedule", value);
      const response = await http("/settings", { method: "POST", headers: { origin }, body });
      await response.text();
      return response.status;
    };
    const threeDraw = [
      "30 | Mobilization | Contract signed and reviewed by the owner | Deposit under the accepted proposal.",
      "40 | Rough-in | Rough-in inspection recorded as passed | Progress billing at rough-in.",
      "30 | Closeout | Final walkthrough and punch recorded | Final billing at closeout.",
    ].join("\n");
    assert.equal(await postSchedule(threeDraw), 303, "the payment schedule action redirects on success");
    const storedSchedule = (await db.organization.findUniqueOrThrow({ where: { id: organizationId } })).defaultPaymentSchedule as Array<{ percent: string; label: string }>;
    assert.deepEqual(storedSchedule.map(m => m.percent), ["30", "40", "30"], "the company schedule is stored");
    const rerendered = await (await http("/settings")).text();
    assert.ok(rerendered.includes("30 | Mobilization"), "the settings editor re-renders the stored schedule for editing");
    assert.equal(await postSchedule("20 | Deposit"), 303, "an unusable schedule is refused with a redirect rather than a crash");
    assert.deepEqual((await db.organization.findUniqueOrThrow({ where: { id: organizationId } })).defaultPaymentSchedule, storedSchedule, "a refused schedule does not overwrite the stored one");
    assert.equal(await postSchedule(""), 303, "a blank schedule clears the override");
    assert.equal((await db.organization.findUniqueOrThrow({ where: { id: organizationId } })).defaultPaymentSchedule ?? null, null, "clearing writes SQL null so the built-in default applies again");
    const clearedHtml = await (await http("/settings")).text();
    assert.ok(!clearedHtml.includes("30 | Mobilization"), "the editor shows the built-in default after clearing");

    writeFileSync(".preservation/company-settings-local-http.json", JSON.stringify({
      checkedAt: new Date().toISOString(),
      settingsPage: 200,
      saveRedirect: save.status,
      persisted: {
        defaultTargetMarginPercent: Number(after.defaultTargetMarginPercent),
        ownerExceptionMarginPercent: Number(after.ownerExceptionMarginPercent),
        changeOrderApprovalThresholdCents: after.changeOrderApprovalThresholdCents,
        invoiceApprovalThresholdCents: after.invoiceApprovalThresholdCents,
        notificationCadence: after.notificationCadence,
      },
      invalidSubmissionRefused: true,
      scenarioDefaultMargin: Number(after.defaultTargetMarginPercent),
      paymentScheduleStored: ["30", "40", "30"],
      paymentScheduleRefusedWithoutWrite: true,
      paymentScheduleClearedToNull: true,
      marginBefore: previousMargin,
      productionMutations: false,
    }, null, 2));
    console.log("PASS: company operations settings save, reject invalid input, and drive the pricing defaults.");
  } finally {
    await db.$disconnect();
  }
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : "Company settings HTTP verification failed");
  process.exitCode = 1;
});
