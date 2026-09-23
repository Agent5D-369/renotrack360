import { prisma } from "@/lib/prisma";
import { readPrivateAsset, storageRoot, type MediaActor } from "@/lib/private-media";

/**
 * Document images come from two places: private company assets served at `/api/files/<id>`, and
 * external absolute URLs. A plain server fetch only ever works for the second kind, because a
 * relative private URL cannot be resolved and the failure is silent.
 *
 * This resolver is the authorized private-buffer path: the asset is read through the same ownership,
 * membership and integrity checks the download route uses, and anything the actor may not read comes
 * back as null rather than bytes.
 */

export const PRIVATE_FILE_URL_PATTERN = /^\/api\/files\/([A-Za-z0-9_-]{1,64})$/;
export const MAX_DOCUMENT_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function fetchExternalImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const declared = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (declared && !ALLOWED_IMAGE_TYPES.includes(declared)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length && bytes.length <= MAX_DOCUMENT_IMAGE_BYTES ? bytes : null;
  } catch {
    return null;
  }
}

export function createDocumentImageResolver(actor: MediaActor): (url: string) => Promise<Buffer | null> {
  return async (url: string) => {
    const candidate = String(url ?? "").trim();
    if (!candidate) return null;
    const privateMatch = PRIVATE_FILE_URL_PATTERN.exec(candidate);
    if (privateMatch) {
      try {
        const { bytes } = await readPrivateAsset(prisma, actor, privateMatch[1], await storageRoot());
        return bytes.length && bytes.length <= MAX_DOCUMENT_IMAGE_BYTES ? bytes : null;
      } catch {
        return null;
      }
    }
    if (!/^https:\/\//i.test(candidate)) return null;
    return fetchExternalImage(candidate);
  };
}
