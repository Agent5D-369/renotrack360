import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "../lib/prisma";
import { createPrivateAsset, readPrivateAsset, storagePath, storageRoot, inspectContent, limitedFileForm, MAX_FILE_BYTES, MediaError } from "../lib/private-media";

const root = path.resolve(".preservation", "media-test-" + randomUUID());
const actor = { id: "media-owner", organizationId: "flipside-org" };
let png: Buffer;
let profileId: string, foreignId: string;
const file = (bytes: Buffer = png, name = "photo.png", type = "image/png") => new File([new Uint8Array(bytes)], name, { type });
const upload = (entityId = profileId, uploadFile = file()) => createPrivateAsset(prisma, actor, { entityType: "PROFILE", entityId, file: uploadFile }, root);

before(async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.pathname, "/flipside_migration_media");
  await mkdir(root, { recursive: true });
  png = await sharp({ create: { width: 2, height: 2, channels: 4, background: "#124f35" } }).png().toBuffer();
  for (const id of ["flipside-org", "media-foreign"]) await prisma.organization.create({ data: { id, name: "Media fixture" } });
  await prisma.user.create({ data: { id: actor.id, email: "media-owner@example.invalid", role: "OWNER", organizationId: actor.organizationId,
    memberships: { create: { organizationId: actor.organizationId, role: "OWNER", status: "ACTIVE" } } } });
  profileId = (await prisma.profile.create({ data: { organizationId: actor.organizationId, profileName: "Private fixture", profileType: "HOMEOWNER" } })).id;
  foreignId = (await prisma.profile.create({ data: { organizationId: "media-foreign", profileName: "Foreign fixture", profileType: "HOMEOWNER" } })).id;
});
after(async () => {
  await prisma.$disconnect();
  const allowed = path.resolve(".preservation") + path.sep;
  assert.ok(root.startsWith(allowed) && path.basename(root).startsWith("media-test-"));
  await rm(root, { recursive: true, force: true });
});

test("private upload persists original bytes, ownership, uploader, digest and audit together", async () => {
  const asset = await upload(profileId, file(png, "../../secret.png"));
  assert.equal(asset.fileName, "secret.png");
  assert.equal(asset.organizationId, actor.organizationId);
  assert.equal(asset.uploadedByUserId, actor.id);
  assert.equal(asset.sha256, createHash("sha256").update(png).digest("hex"));
  assert.equal(asset.url, `/api/files/${asset.id}`);
  assert.equal(asset.storageProvider, "private-volume");
  assert.deepEqual(await readFile(storagePath(root, asset.storageKey!)), png);
  assert.deepEqual((await readPrivateAsset(prisma, actor, asset.id, root)).bytes, png);
  const events = await prisma.auditEvent.findMany({ where: { entityId: asset.id } });
  assert.equal(events.length, 1); assert.equal(events[0].action, "FILE_UPLOADED");
  assert.equal(events[0].actorUserId, actor.id);
});

test("foreign/missing parents and revoked actors cannot upload or retrieve private evidence", async () => {
  const count = await prisma.fileAsset.count(), paths = await readdir(root);
  await assert.rejects(() => upload(foreignId), error => error instanceof MediaError && error.status === 404);
  await assert.rejects(() => upload("missing-parent"), MediaError);
  const asset = await upload();
  await prisma.membership.updateMany({ where: { userId: actor.id }, data: { status: "DISABLED" } });
  try {
    await assert.rejects(() => upload(), error => error instanceof MediaError && error.status === 403);
    await assert.rejects(() => readPrivateAsset(prisma, actor, asset.id, root), MediaError);
  } finally { await prisma.membership.updateMany({ where: { userId: actor.id }, data: { status: "ACTIVE" } }); }
  assert.equal(await prisma.fileAsset.count(), count + 1);
  assert.equal((await readdir(root)).length, paths.length + 1);
});

test("HTML/SVG disguised as images, truncated images, mismatched MIME and oversized files fail", async () => {
  const count = await prisma.fileAsset.count();
  const html = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  await assert.rejects(() => upload(profileId, file(html)), MediaError);
  await assert.rejects(() => upload(profileId, file(png.subarray(0, 25))), MediaError);
  await assert.rejects(() => upload(profileId, file(png, "photo.pdf", "application/pdf")), MediaError);
  await assert.rejects(() => upload(profileId, file(Buffer.alloc(MAX_FILE_BYTES + 1))), MediaError);
  assert.throws(() => inspectContent(Buffer.alloc(0), "image/png"), MediaError);
  assert.equal(await prisma.fileAsset.count(), count);
});

test("storage keys cannot traverse paths and corrupt evidence is refused", async () => {
  for (const key of ["../file", "..\\file", "/etc/passwd", "C:\\secret", "not-a-key"]) {
    assert.throws(() => storagePath(root, key), MediaError);
  }
  const asset = await upload();
  const location = storagePath(root, asset.storageKey!);
  await writeFile(location, Buffer.from("corrupt"));
  await assert.rejects(() => readPrivateAsset(prisma, actor, asset.id, root), error => error instanceof MediaError && error.status === 409);
});

test("audit insertion failure rolls back the asset row and removes its newly written blob", async () => {
  const count = await prisma.fileAsset.count(), paths = await readdir(root);
  await prisma.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT "media_test_block" CHECK (action <> 'FILE_UPLOADED') NOT VALID`);
  try { await assert.rejects(() => upload()); }
  finally { await prisma.$executeRawUnsafe(`ALTER TABLE "AuditEvent" DROP CONSTRAINT "media_test_block"`); }
  assert.equal(await prisma.fileAsset.count(), count);
  assert.deepEqual(await readdir(root), paths);
});

test("audit events cannot be updated or deleted through ordinary database commands", async () => {
  const asset = await upload();
  const event = await prisma.auditEvent.findFirstOrThrow({ where: { entityId: asset.id } });
  await assert.rejects(() => prisma.auditEvent.update({ where: { id: event.id }, data: { action: "CHANGED" } }), /append-only/);
  await assert.rejects(() => prisma.auditEvent.delete({ where: { id: event.id } }), /append-only/);
  await assert.rejects(() => prisma.$executeRawUnsafe('TRUNCATE "AuditEvent"'), /append-only/);
  assert.equal((await prisma.auditEvent.findUniqueOrThrow({ where: { id: event.id } })).action, "FILE_UPLOADED");
});

test("production cannot silently use ephemeral storage", async () => {
  await assert.rejects(() => storageRoot({ NODE_ENV: "production" }), MediaError);
  await assert.rejects(() => storageRoot({ NODE_ENV: "production", PRIVATE_MEDIA_ROOT: root }), MediaError);
  assert.equal(await storageRoot({ NODE_ENV: "test", PRIVATE_MEDIA_ROOT: root }), await import("node:fs/promises").then(fs => fs.realpath(root)));
});

test("multipart parsing stops an oversized stream even without a content-length header", async () => {
  let remaining = 12;
  const body = new ReadableStream<Uint8Array>({ pull(controller) {
    if (remaining-- > 0) controller.enqueue(new Uint8Array(1024 * 1024)); else controller.close();
  } });
  const request = new Request("http://localhost/upload", { method: "POST", body, duplex: "half" } as RequestInit);
  await assert.rejects(() => limitedFileForm(request), error => error instanceof MediaError && error.status === 413);
});
