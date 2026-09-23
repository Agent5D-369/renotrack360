import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Operator-managed encryption for customer bring-your-own API keys.
 *
 * Stored values are self-describing so a key can be rotated without a data migration:
 * `v1.<keyId>.<iv>.<tag>.<ciphertext>` with base64url parts.
 *
 * Plaintext keys are never returned to a form, a log or a vault note. Callers may
 * only encrypt on write and decrypt in the server runtime at request time.
 */

export const AI_SECRET_KEY_ENV = "AI_SECRET_ENCRYPTION_KEY";
export const AI_SECRET_PREVIOUS_KEY_ENV = "AI_SECRET_ENCRYPTION_KEY_PREVIOUS";

const VERSION = "v1";
const AAD_PREFIX = "renotrack360:ai-provider-credential:";

export class AiSecretError extends Error {
  constructor(message = "The AI provider credential could not be used.") {
    super(message);
    this.name = "AiSecretError";
  }
}

export type AiSecretEnvironment = Record<string, string | undefined>;

/** Accepts base64, base64url or hex material that decodes to exactly 32 bytes. */
export function parseAiSecretKey(value: string | undefined | null): Buffer | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const candidates: Buffer[] = [];
  if (/^[0-9a-f]{64}$/i.test(trimmed)) candidates.push(Buffer.from(trimmed, "hex"));
  if (/^[A-Za-z0-9+/_-]{43,44}={0,2}$/.test(trimmed)) {
    candidates.push(Buffer.from(trimmed.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
  }
  return candidates.find(candidate => candidate.length === 32) ?? null;
}

export function currentAiSecretKey(environment: AiSecretEnvironment = process.env): Buffer {
  const key = parseAiSecretKey(environment[AI_SECRET_KEY_ENV]);
  if (!key) throw new AiSecretError(`Set ${AI_SECRET_KEY_ENV} to a 32-byte base64 or hex key before storing provider credentials.`);
  return key;
}

export function previousAiSecretKey(environment: AiSecretEnvironment = process.env): Buffer | null {
  return parseAiSecretKey(environment[AI_SECRET_PREVIOUS_KEY_ENV]);
}

export function aiSecretKeyId(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/** Stable short identifier shown in place of a stored credential. Never reversible. */
export function aiSecretFingerprint(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex").slice(0, 12);
}

export function encryptAiSecret(plaintext: string, key: Buffer = currentAiSecretKey()): string {
  const value = plaintext.trim();
  if (!value || value.length > 4_096 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new AiSecretError("The supplied AI provider credential is not a usable key value.");
  }
  const keyId = aiSecretKeyId(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(AAD_PREFIX + keyId, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [VERSION, keyId, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

/** Fails closed: an unknown key id, a tampered payload or a missing operator key all throw. */
export function decryptAiSecret(stored: string, keys: readonly Buffer[]): string {
  const parts = stored.split(".");
  if (parts.length !== 5 || parts[0] !== VERSION) throw new AiSecretError();
  const [, keyId, ivPart, tagPart, cipherPart] = parts;
  const key = keys.find(candidate => aiSecretKeyId(candidate) === keyId);
  if (!key) throw new AiSecretError("The stored AI provider credential was encrypted with a key that is not configured.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
    decipher.setAAD(Buffer.from(AAD_PREFIX + keyId, "utf8"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(cipherPart, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new AiSecretError("The stored AI provider credential could not be decrypted.");
  }
}

export function decryptStoredAiSecret(stored: string, environment: AiSecretEnvironment = process.env): string {
  const keys = [currentAiSecretKey(environment), previousAiSecretKey(environment)].filter((key): key is Buffer => Boolean(key));
  return decryptAiSecret(stored, keys);
}
