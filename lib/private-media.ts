import { FileEntityType, Prisma, PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, realpath, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { hasStaffAccess } from "./staff-policy";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export class MediaError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
type Db = Prisma.TransactionClient;
export type MediaActor = { id: string; organizationId: string };

export function inspectContent(bytes: Buffer, declaredType: string) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new MediaError("Choose a file between 1 byte and 10 MB.");
  let type: string | undefined;
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) type = "image/png";
  else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) type = "image/jpeg";
  else if (bytes.length >= 16 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") type = "image/webp";
  else if (bytes.length >= 8 && bytes.toString("ascii", 0, 5) === "%PDF-") type = "application/pdf";
  if (!type || (declaredType && declaredType !== "application/octet-stream" && declaredType !== type)) {
    throw new MediaError("Upload a JPG, PNG, WebP or PDF whose contents match its file type.");
  }
  return type;
}

export async function assertEntityOwnership(db: Db, entityType: FileEntityType, id: string, org: string) {
  let owner: string | undefined;
  switch (entityType) {
    case "PROFILE": owner = (await db.profile.findUnique({ where: { id }, select: { organizationId: true } }))?.organizationId; break;
    case "PROPERTY": owner = (await db.property.findUnique({ where: { id }, select: { organizationId: true } }))?.organizationId; break;
    case "QUOTE": owner = (await db.quote.findUnique({ where: { id }, select: { organizationId: true } }))?.organizationId; break;
    case "JOB": owner = (await db.job.findUnique({ where: { id }, select: { organizationId: true } }))?.organizationId; break;
    case "WEEKLY_REPORT": owner = (await db.weeklyReport.findUnique({ where: { id }, select: { job: { select: { organizationId: true } } } }))?.job.organizationId; break;
    case "CHANGE_ORDER": owner = (await db.changeOrder.findUnique({ where: { id }, select: { job: { select: { organizationId: true } } } }))?.job.organizationId; break;
    case "INVOICE": {
      const invoice = await db.invoice.findUnique({ where: { id }, select: { job: { select: { organizationId: true } }, clientProfile: { select: { organizationId: true } } } });
      const owners = [invoice?.job?.organizationId, invoice?.clientProfile?.organizationId].filter(Boolean);
      if (owners.length && owners.every(value => value === org)) owner = org;
      break;
    }
  }
  if (owner !== org) throw new MediaError("This record is not available for file access.", 404);
}

async function checkActor(db: Db, actor: MediaActor) {
  const user = await db.user.findUnique({ where: { id: actor.id }, include: { memberships: { where: { organizationId: actor.organizationId } } } });
  if (!hasStaffAccess(user, user?.memberships[0] ?? null) || user?.organizationId !== actor.organizationId) {
    throw new MediaError("Staff access denied.", 403);
  }
}

export async function storageRoot(env: Readonly<Record<string, string | undefined>> = process.env) {
  const production = env.NODE_ENV === "production" || Boolean(env.RAILWAY_PROJECT_ID);
  const configured = env.PRIVATE_MEDIA_ROOT;
  if (production && (!configured || !path.isAbsolute(configured))) {
    throw new MediaError("Private file storage is unavailable.", 503);
  }
  const root = path.resolve(configured || "uploads/private");
  if (production) {
    // Refuse an ordinary container directory masquerading as durable storage.
    let parent = root;
    while (true) {
      try {
        const storageDevice = await stat(parent), rootDevice = await stat(path.parse(root).root);
        if (storageDevice.dev === rootDevice.dev) throw new MediaError("Private file storage requires a persistent volume.", 503);
        break;
      } catch (error) {
        if (error instanceof MediaError) throw error;
        if ((error as NodeJS.ErrnoException).code !== "ENOENT" || path.dirname(parent) === parent) throw new MediaError("Private file storage is unavailable.", 503);
        parent = path.dirname(parent);
      }
    }
  }
  await mkdir(root, { recursive: true, mode: 0o700 });
  return realpath(root);
}

export function storagePath(root: string, key: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(key)) {
    throw new MediaError("File storage reference is invalid.", 404);
  }
  const destination = path.resolve(root, key);
  if (path.dirname(destination) !== path.resolve(root)) throw new MediaError("File storage reference is invalid.", 404);
  return destination;
}

export async function createPrivateAsset(db: PrismaClient, actor: MediaActor, input: {
  entityType: FileEntityType; entityId: string; file: File; notes?: string;
}, root: string) {
  await checkActor(db, actor);
  await assertEntityOwnership(db, input.entityType, input.entityId, actor.organizationId);
  if (input.file.size > MAX_FILE_BYTES || !input.file.size) throw new MediaError("Choose a file between 1 byte and 10 MB.");
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const mimeType = inspectContent(bytes, input.file.type);
  if (mimeType.startsWith("image/")) {
    try {
      // Decode for validation without altering the retained original or its metadata.
      await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" }).stats();
    } catch { throw new MediaError("The image is damaged, unsupported or exceeds 40 megapixels."); }
  } else if (!/%%EOF\s*$/.test(bytes.toString("latin1", Math.max(0, bytes.length - 1024)))) {
    throw new MediaError("The PDF appears incomplete.");
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const id = randomUUID(), key = randomUUID(), filename = storagePath(root, key);
  const fileName = path.basename(input.file.name.replaceAll("\\", "/")).replace(/[\x00-\x1f\x7f]/g, "").slice(0, 180) || "file";
  const handle = await open(filename, "wx", 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); }
  catch (error) { await handle.close(); await unlink(filename).catch(() => undefined); throw error; }
  await handle.close();
  try {
    return await db.$transaction(async tx => {
      await checkActor(tx, actor);
      await assertEntityOwnership(tx, input.entityType, input.entityId, actor.organizationId);
      const asset = await tx.fileAsset.create({ data: { id, organizationId: actor.organizationId,
        entityType: input.entityType, entityId: input.entityId, fileName, mimeType, size: bytes.length,
        url: `/api/files/${id}`, storageProvider: "private-volume", storageKey: key, sha256,
        uploadedByUserId: actor.id, notes: input.notes?.slice(0, 2000) || null } });
      await tx.auditEvent.create({ data: { organizationId: actor.organizationId, actorUserId: actor.id,
        action: "FILE_UPLOADED", entityType: "FileAsset", entityId: id,
        metadata: { sha256, size: bytes.length, mimeType, parentType: input.entityType, parentId: input.entityId } } });
      return asset;
    });
  } catch (error) {
    await unlink(filename).catch(() => undefined);
    throw error;
  }
}

export async function readPrivateAsset(db: PrismaClient, actor: MediaActor, id: string, root: string) {
  await checkActor(db, actor);
  const asset = await db.fileAsset.findUnique({ where: { id } });
  if (!asset || asset.organizationId !== actor.organizationId || asset.storageProvider !== "private-volume" || !asset.storageKey || !asset.sha256) {
    throw new MediaError("File not found.", 404);
  }
  await assertEntityOwnership(db, asset.entityType, asset.entityId, actor.organizationId);
  const filename = storagePath(root, asset.storageKey);
  if (await realpath(filename).catch(() => "") !== filename) throw new MediaError("File not found.", 404);
  const bytes = await readFile(filename);
  if (bytes.length !== asset.size || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) {
    throw new MediaError("File integrity check failed. Contact the project owner.", 409);
  }
  return { asset, bytes };
}

export async function limitedFileForm(request: Request) {
  const limit = MAX_FILE_BYTES + 1024 * 1024;
  if (Number(request.headers.get("content-length")) > limit) throw new MediaError("Upload request is too large.", 413);
  if (!request.body) throw new MediaError("A file upload is required.");
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new MediaError("Upload request is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    return await new Request(request.url, { method: "POST", headers: request.headers,
      body: new Blob([new Uint8Array(Buffer.concat(chunks))]) }).formData();
  } catch { throw new MediaError("A valid file upload is required."); }
}
