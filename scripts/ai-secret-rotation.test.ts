import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { AiSecretError, aiSecretKeyId, decryptAiSecret, encryptAiSecret, parseAiSecretKey } from "../lib/ai-secrets";
import { applyAiSecretRotation, planAiSecretRotation, storedAiSecretKeyId } from "../lib/ai-secret-rotation";

const newKey = () => randomBytes(32);
const keyId = (key: Buffer) => createHash("sha256").update(key).digest("hex").slice(0, 16);

/** Both keys configured, distinct, and 32 bytes of real material. */
function environment(outgoing: Buffer, incoming: Buffer) {
  return {
    AI_SECRET_ENCRYPTION_KEY: incoming.toString("base64"),
    AI_SECRET_ENCRYPTION_KEY_PREVIOUS: outgoing.toString("base64"),
  };
}

test("a value already on the current key is planned as already-current and never rewritten", () => {
  const current = newKey(), outgoing = newKey();
  const stored = encryptAiSecret("live-company-key", current);
  const { updates } = applyAiSecretRotation([{ id: "row-1", stored }], environment(outgoing, current));
  assert.equal(updates.length, 0);
  const plan = planAiSecretRotation([{ id: "row-1", stored }], environment(outgoing, current));
  assert.equal(plan.counts["already-current"], 1);
  assert.equal(plan.entries[0].storedKeyId, aiSecretKeyId(current));
});

test("a value on the outgoing key is re-encrypted and still decrypts to the original plaintext", () => {
  const current = newKey(), outgoing = newKey();
  const plaintext = "company-key-that-must-survive-rotation";
  const records = [
    { id: "row-old", stored: encryptAiSecret(plaintext, outgoing) },
    { id: "row-new", stored: encryptAiSecret("already-migrated", current) },
    { id: "row-none", stored: null },
  ];
  const { plan, updates } = applyAiSecretRotation(records, environment(outgoing, current));
  assert.equal(plan.counts.rotatable, 1);
  assert.deepEqual(updates.map(update => update.id), ["row-old"]);
  assert.equal(updates[0].keyId, aiSecretKeyId(current));
  assert.equal(storedAiSecretKeyId(updates[0].stored), aiSecretKeyId(current));
  assert.equal(decryptAiSecret(updates[0].stored, [current]), plaintext);
  assert.equal(plaintext.includes("company-key"), true);
});

test("a tampered value is unreadable, is not rewritten, and does not abort the other rows", () => {
  const current = newKey(), outgoing = newKey();
  const intact = encryptAiSecret("intact-credential", outgoing);
  const parts = intact.split(".");
  parts[4] = Buffer.from("tampered-ciphertext-bytes").toString("base64url");
  const records = [
    { id: "row-tampered", stored: parts.join(".") },
    { id: "row-ok", stored: intact },
  ];
  const { plan, updates } = applyAiSecretRotation(records, environment(outgoing, current));
  assert.equal(plan.counts.unreadable, 1);
  assert.equal(plan.entries.find(entry => entry.id === "row-tampered")?.classification, "unreadable");
  assert.deepEqual(updates.map(update => update.id), ["row-ok"]);
  assert.equal(decryptAiSecret(updates[0].stored, [current]), "intact-credential");
});

test("a malformed stored value is unreadable rather than fatal", () => {
  const current = newKey(), outgoing = newKey();
  const { plan, updates } = applyAiSecretRotation([{ id: "row-junk", stored: "not-a-stored-secret" }], environment(outgoing, current));
  assert.equal(plan.counts.unreadable, 1);
  assert.equal(storedAiSecretKeyId("not-a-stored-secret"), null);
  assert.equal(updates.length, 0);
});

test("rotation refuses to run without a current key, without an outgoing key, or with the same key twice", () => {
  const current = newKey(), outgoing = newKey();
  const records = [{ id: "row", stored: encryptAiSecret("some-credential", outgoing) }];

  assert.throws(
    () => planAiSecretRotation(records, { AI_SECRET_ENCRYPTION_KEY_PREVIOUS: outgoing.toString("base64") }),
    (error: unknown) => error instanceof AiSecretError && /AI_SECRET_ENCRYPTION_KEY/.test(error.message)
  );
  assert.throws(
    () => planAiSecretRotation(records, { AI_SECRET_ENCRYPTION_KEY: current.toString("base64") }),
    (error: unknown) => error instanceof AiSecretError && /AI_SECRET_ENCRYPTION_KEY_PREVIOUS/.test(error.message)
  );
  assert.throws(
    () => planAiSecretRotation(records, environment(current, current)),
    (error: unknown) => error instanceof AiSecretError && /same key/.test(error.message)
  );
});

test("a key that is not 32 bytes is rejected before anything is written", () => {
  assert.equal(parseAiSecretKey("short-key"), null);
  assert.throws(
    () => applyAiSecretRotation([{ id: "row", stored: "aisecret.v1.abc.def.ghi.jkl" }], {
      AI_SECRET_ENCRYPTION_KEY: "short-key",
      AI_SECRET_ENCRYPTION_KEY_PREVIOUS: randomBytes(32).toString("base64"),
    }),
    AiSecretError
  );
});

test("running the job twice is idempotent: the second run writes nothing", () => {
  const current = newKey(), outgoing = newKey();
  const environmentBoth = environment(outgoing, current);
  const plaintexts = ["first-credential", "second-credential", "third-credential"];
  const first = applyAiSecretRotation(plaintexts.map((value, index) => ({ id: `row-${index}`, stored: encryptAiSecret(value, outgoing) })), environmentBoth);
  assert.equal(first.updates.length, 3);

  const second = applyAiSecretRotation(first.updates.map(update => ({ id: update.id, stored: update.stored })), environmentBoth);
  assert.equal(second.updates.length, 0);
  assert.equal(second.plan.counts["already-current"], 3);
  assert.equal(second.plan.counts.rotatable, 0);
  for (const [index, update] of first.updates.entries()) {
    assert.equal(decryptAiSecret(update.stored, [current]), plaintexts[index]);
    assert.throws(() => decryptAiSecret(update.stored, [outgoing]), AiSecretError);
  }
});

test("a dry run reports the same rows the apply run would write, and writes none of them", () => {
  const current = newKey(), outgoing = newKey();
  const environmentBoth = environment(outgoing, current);
  const records = [
    { id: "row-a", stored: encryptAiSecret("credential-a", outgoing) },
    { id: "row-b", stored: encryptAiSecret("credential-b", current) },
  ];
  const plan = planAiSecretRotation(records, environmentBoth);
  const dryRunRotatable = plan.entries.filter(entry => entry.classification === "rotatable").map(entry => entry.id);
  assert.deepEqual(dryRunRotatable, ["row-a"]);
  // The plan carries no credential material of any kind.
  assert.equal(JSON.stringify(plan).includes("credential-a"), false);
  assert.equal(JSON.stringify(plan).includes(records[0].stored), false);

  const applied = applyAiSecretRotation(records, environmentBoth);
  assert.deepEqual(applied.updates.map(update => update.id), dryRunRotatable);
  // The records handed in are untouched: this module never mutates its input.
  assert.equal(storedAiSecretKeyId(records[0].stored), keyId(outgoing));
  assert.equal(decryptAiSecret(records[0].stored, [outgoing]), "credential-a");
});
