import { FileEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff-access";
import { createPrivateAsset, storageRoot } from "@/lib/private-media";

export async function storeFile(input: {
  entityType: FileEntityType;
  entityId: string;
  file: File;
  notes?: string;
}) {
  const actor = await requireStaff();
  return createPrivateAsset(prisma, actor, input, await storageRoot());
}

// Preserve import compatibility while routing all new project files to private storage.
export { storeFile as storeLocalFile, storeFile as storeLocalFileImpl };
