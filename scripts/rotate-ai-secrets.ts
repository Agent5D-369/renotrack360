import { PrismaClient } from "@prisma/client";
import { AI_SECRET_KEY_ENV, AI_SECRET_PREVIOUS_KEY_ENV } from "../lib/ai-secrets";
import { applyAiSecretRotation, planAiSecretRotation, type AiSecretRecord } from "../lib/ai-secret-rotation";

/**
 * Re-encrypt every stored bring-your-own provider credential onto a new operator key.
 *
 * Procedure:
 *   1. Set AI_SECRET_ENCRYPTION_KEY to the new key.
 *   2. Set AI_SECRET_ENCRYPTION_KEY_PREVIOUS to the outgoing key.
 *   3. Run this script with no flags to review the plan.
 *   4. Run it with --apply, confirm zero unreadable values, then remove the previous key.
 *
 * Nothing is written without --apply. Credential values are never printed.
 */

async function main() {
  const apply = process.argv.includes("--apply");
  const db = new PrismaClient({ log: [] });
  try {
    const rows = await db.aiProviderConfig.findMany({
      where: { secretCiphertext: { not: null } },
      select: { id: true, secretCiphertext: true, organizationId: true, provider: true },
      orderBy: { id: "asc" }
    });
    const records: AiSecretRecord[] = rows.map(row => ({ id: row.id, stored: row.secretCiphertext }));

    const plan = planAiSecretRotation(records);
    const rotatable = plan.entries.filter(entry => entry.classification === "rotatable");
    console.log(JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      storedCredentials: records.length,
      currentKeyId: plan.currentKeyId,
      previousKeyId: plan.previousKeyId,
      counts: plan.counts,
      willRotate: rotatable.map(entry => entry.id)
    }, null, 2));

    if (plan.counts.unreadable > 0) {
      console.warn(`WARNING: ${plan.counts.unreadable} stored credential(s) cannot be read by either configured key. They will be left untouched.`);
    }
    if (!apply) {
      console.log("Dry run only. Re-run with --apply to re-encrypt the listed rows.");
      return;
    }

    const { updates } = applyAiSecretRotation(records);
    for (const update of updates) {
      await db.aiProviderConfig.update({
        where: { id: update.id },
        data: { secretCiphertext: update.stored, secretKeyId: update.keyId, secretUpdatedAt: update.secretUpdatedAt }
      });
    }
    console.log(JSON.stringify({ rotated: updates.length, unchanged: records.length - updates.length }, null, 2));

    const after = await db.aiProviderConfig.findMany({
      where: { secretCiphertext: { not: null } },
      select: { id: true, secretCiphertext: true }
    });
    const confirm = planAiSecretRotation(after.map(row => ({ id: row.id, stored: row.secretCiphertext })));
    console.log(JSON.stringify({ afterCounts: confirm.counts }, null, 2));
    if (confirm.counts.rotatable > 0) {
      throw new Error("Rotation did not settle: some values are still on the outgoing key.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Rotation stopped: ${message}`);
    process.exitCode = 1;
    if (message.includes(AI_SECRET_KEY_ENV) || message.includes(AI_SECRET_PREVIOUS_KEY_ENV)) {
      console.error("Fail-closed: configure both keys before rotating. Nothing was written.");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "AI secret rotation failed");
  process.exitCode = 1;
});
