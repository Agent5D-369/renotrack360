import assert from "node:assert/strict";
import test from "node:test";
import {
  companyBillingSchedule,
  defaultBillingMilestones,
  defaultScheduleText,
  parseDefaultScheduleText,
} from "../lib/billing-schedule";

test("the company schedule text parses into a valid schedule and survives a round trip", () => {
  const parsed = parseDefaultScheduleText(defaultScheduleText(defaultBillingMilestones));
  assert.equal(parsed.length, 4);
  assert.deepEqual(parsed.map(milestone => milestone.percent), ["20", "30", "40", "10"]);
  assert.equal(parsed[0].label, defaultBillingMilestones[0].label);
  assert.equal(parsed[3].clientDescription, defaultBillingMilestones[3].clientDescription);
  assert.ok(parsed.every(milestone => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(milestone.key)), "keys are derived slugs");
  assert.deepEqual(parseDefaultScheduleText(defaultScheduleText(parsed)), parsed, "text round trips");
});

test("a company schedule may differ in shape while still totalling 100 percent", () => {
  const threeDraw = parseDefaultScheduleText([
    "30 | Mobilization | Contract signed and mobilization reviewed by the owner | Deposit under the accepted proposal.",
    "40 | Rough-in | Rough-in inspection recorded as passed | Progress billing at rough-in.",
    "30 | Closeout | Final walkthrough and punch recorded | Final billing at closeout.",
  ].join("\n"));
  assert.equal(threeDraw.length, 3);
  assert.deepEqual(threeDraw.map(milestone => milestone.percent), ["30", "40", "30"]);
});

test("an unusable schedule is refused rather than silently accepted", () => {
  assert.throws(() => parseDefaultScheduleText("20 | Deposit"), /four parts/);
  assert.throws(
    () => parseDefaultScheduleText("20 | Deposit | Trigger | Description\n20 | Second | Trigger | Description"),
    /exactly 100%/,
    "a schedule that does not total 100 percent is refused"
  );
  assert.throws(() => parseDefaultScheduleText("0 | Deposit | Trigger | Description"), /greater than zero/);
  assert.throws(() => parseDefaultScheduleText(""), /at least 1|Array must contain/i);
});

test("the stored schedule falls back to the built-in default when absent or unusable", () => {
  assert.deepEqual(companyBillingSchedule(null).map(m => m.percent), ["20", "30", "40", "10"]);
  assert.deepEqual(companyBillingSchedule(undefined).map(m => m.percent), ["20", "30", "40", "10"]);
  assert.deepEqual(companyBillingSchedule([{ key: "broken" }]).map(m => m.percent), ["20", "30", "40", "10"]);
  assert.deepEqual(companyBillingSchedule("not-a-schedule").map(m => m.percent), ["20", "30", "40", "10"]);
  const stored = parseDefaultScheduleText("50 | Half up front | Signed contract | Half of the accepted price at signing.\n50 | Half at completion | Final walkthrough recorded | Remainder at completion.");
  assert.deepEqual(companyBillingSchedule(stored).map(m => m.percent), ["50", "50"]);
  assert.notEqual(companyBillingSchedule(null), defaultBillingMilestones, "the fallback is a copy, not the shared constant");
});
