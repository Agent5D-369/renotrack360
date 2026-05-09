import { FileEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function storeFile(input: {
  entityType: FileEntityType;
  entityId: string;
  file: File;
  notes?: string;
}) {
  if (process.env.CLOUDINARY_URL) {
    return storeCloudinary(input);
  }
  return storeLocalFileFallback(input);
}

// Keep old name for backwards compat with existing import in upload route
export { storeFile as storeLocalFile }; // eslint-disable-line @typescript-eslint/no-unused-vars

async function storeCloudinary(input: {
  entityType: FileEntityType;
  entityId: string;
  file: File;
  notes?: string;
}) {
  const { v2: cloudinary } = await import("cloudinary");
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const folder = `renotrack360/${input.entityType.toLowerCase()}/${input.entityId}`;

  const result: { secure_url: string; public_id: string } = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto", use_filename: true, unique_filename: true },
      (err, res) => (err ? reject(err) : resolve(res!))
    ).end(buffer);
  });

  return prisma.fileAsset.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      fileName: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      size: input.file.size,
      url: result.secure_url,
      storageProvider: "cloudinary",
      notes: input.notes
    }
  });
}

async function storeLocalFileFallback(input: {
  entityType: FileEntityType;
  entityId: string;
  file: File;
  notes?: string;
}) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const uploadRoot = process.env.LOCAL_UPLOAD_DIR ?? "./uploads";
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const folder = path.join(process.cwd(), uploadRoot, input.entityType.toLowerCase(), input.entityId);
  await mkdir(folder, { recursive: true });
  const filePath = path.join(folder, `${Date.now()}-${safeName}`);
  await writeFile(filePath, buffer);

  return prisma.fileAsset.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      fileName: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      size: input.file.size,
      url: filePath,
      storageProvider: "local",
      notes: input.notes
    }
  });
}

// Alias for fallback
const storeLocalFileImpl = storeLocalFileFallback;
export { storeLocalFileImpl };
