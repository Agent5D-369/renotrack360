import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FileEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function storeLocalFile(input: {
  entityType: FileEntityType;
  entityId: string;
  file: File;
  notes?: string;
}) {
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
