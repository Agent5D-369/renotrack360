import {
  AI_SECRET_KEY_ENV,
  AI_SECRET_PREVIOUS_KEY_ENV,
  AiSecretError,
  aiSecretKeyId,
  currentAiSecretKey,
  decryptAiSecret,
  encryptAiSecret,
  previousAiSecretKey,
  type AiSecretEnvironment,
} from "./ai-secrets";

/**
 * Operator key rotation for stored bring-your-own provider credentials.
 *
 * Stored values are self-describing (`aisecret.v1.<keyId>.<iv>.<tag>.<ciphertext>`), so a rotation
 * is an online re-encryption rather than a data migration: configure the new key, move the outgoing
 * key to the previous slot, re-encrypt every value that is still on the old key, then retire the old
 * key. This module performs no writes and holds no database access; the caller decides what to store.
 *
 * Plaintext never leaves this module. A plan reports ids, classifications and key ids only.
 */

/**
 * The version prefix `encryptAiSecret` actually writes. Note that the doc comment in
 * lib/ai-secrets.ts describes the value as `aisecret.v1.<keyId>...`, but the encoder joins
 * `VERSION` alone, so every stored value really begins `v1.`. Reading the encoder rather than the
 * comment is what keeps this classifier from silently treating every row as unreadable.
 */
export const AI_SECRET_FORMAT = "v1";

export type AiSecretClassification = "already-current" | "rotatable" | "unreadable" | "not-applicable";

export interface AiSecretRecord {
  id: string;
  /** The stored ciphertext, or null when this row keeps its credential in an environment reference. */
  stored: string | null;
}

export interface AiSecretPlanEntry {
  id: string;
  classification: AiSecretClassification;
  /** The key id the stored value was encrypted with, when it can be read from the value itself. */
  storedKeyId: string | null;
  reason: string;
}

export interface AiSecretRotationPlan {
  currentKeyId: string;
  previousKeyId: string;
  counts: Record<AiSecretClassification, number>;
  entries: AiSecretPlanEntry[];
}

export interface AiSecretRotationResult {
  plan: AiSecretRotationPlan;
  /** One entry per value that must actually be written. Empty when there is nothing to do. */
  updates: Array<{ id: string; stored: string; keyId: string; secretUpdatedAt: Date }>;
}

/** Reads the key id out of a stored value without decrypting it. */
export function storedAiSecretKeyId(stored: string): string | null {
  const parts = stored.split(".");
  if (parts.length !== 5 || parts[0] !== AI_SECRET_FORMAT) return null;
  return parts[1] || null;
}

interface RotationKeys {
  current: Buffer;
  previous: Buffer;
  currentKeyId: string;
  previousKeyId: string;
}

/**
 * Fail closed: rotation is only meaningful with a new key and a distinct outgoing key. A missing or
 * reused key must stop the job rather than half-rotate a stored credential set.
 */
export function rotationKeys(environment: AiSecretEnvironment = process.env): RotationKeys {
  const current = currentAiSecretKey(environment);
  const previous = previousAiSecretKey(environment);
  if (!previous) {
    throw new AiSecretError(`Set ${AI_SECRET_PREVIOUS_KEY_ENV} to the outgoing key before rotating stored provider credentials.`);
  }
  if (current.equals(previous)) {
    throw new AiSecretError(`${AI_SECRET_KEY_ENV} and ${AI_SECRET_PREVIOUS_KEY_ENV} hold the same key, so there is nothing to rotate.`);
  }
  return { current, previous, currentKeyId: aiSecretKeyId(current), previousKeyId: aiSecretKeyId(previous) };
}

function classify(stored: string | null, keys: RotationKeys): AiSecretPlanEntry["classification"] {
  if (!stored) return "not-applicable";
  if (storedAiSecretKeyId(stored) === keys.currentKeyId) return "already-current";
  return "rotatable";
}

/**
 * Decide what would change, without changing anything and without returning any credential material.
 * A value that neither key can read is reported as unreadable instead of aborting the whole run, so
 * one damaged row cannot block the rotation of every other row.
 */
export function planAiSecretRotation(
  records: readonly AiSecretRecord[],
  environment: AiSecretEnvironment = process.env
): AiSecretRotationPlan {
  const keys = rotationKeys(environment);
  const entries: AiSecretPlanEntry[] = records.map(record => {
    const classification = classify(record.stored, keys);
    const storedKeyId = record.stored ? storedAiSecretKeyId(record.stored) : null;
    if (classification !== "rotatable") {
      return {
        id: record.id,
        classification,
        storedKeyId,
        reason: classification === "not-applicable"
          ? "No stored credential on this row."
          : "Already encrypted with the configured key.",
      };
    }
    try {
      decryptAiSecret(record.stored!, [keys.previous]);
      return { id: record.id, classification, storedKeyId, reason: "Encrypted with the outgoing key; can be re-encrypted." };
    } catch {
      // A value on an unrecognised key, or a tampered value, is left exactly as it is.
      return { id: record.id, classification: "unreadable", storedKeyId, reason: "Neither the configured nor the outgoing key can read this value." };
    }
  });
  const counts: Record<AiSecretClassification, number> = { "already-current": 0, rotatable: 0, unreadable: 0, "not-applicable": 0 };
  for (const entry of entries) counts[entry.classification] += 1;
  return { currentKeyId: keys.currentKeyId, previousKeyId: keys.previousKeyId, counts, entries };
}

/**
 * Produce the row values for a rotation. Safe to run repeatedly: a second run finds every value on
 * the current key and writes nothing.
 */
export function applyAiSecretRotation(
  records: readonly AiSecretRecord[],
  environment: AiSecretEnvironment = process.env
): AiSecretRotationResult {
  const keys = rotationKeys(environment);
  const plan = planAiSecretRotation(records, environment);
  const rotatable = new Set(plan.entries.filter(entry => entry.classification === "rotatable").map(entry => entry.id));
  const updates = records
    .filter(record => rotatable.has(record.id))
    .map(record => {
      const plaintext = decryptAiSecret(record.stored!, [keys.previous]);
      return {
        id: record.id,
        stored: encryptAiSecret(plaintext, keys.current),
        keyId: keys.currentKeyId,
        secretUpdatedAt: new Date(),
      };
    });
  return { plan, updates };
}
