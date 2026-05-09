import { FileEntityType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeLocalFile } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  const entityId = String(formData.get("entityId") ?? "");
  const entityType = String(formData.get("entityType") ?? "");
  const notes = String(formData.get("notes") ?? "");

  if (!(file instanceof File) || !entityId || !(entityType in FileEntityType)) {
    return NextResponse.json({ error: "file, entityId, and entityType are required" }, { status: 400 });
  }

  const asset = await storeLocalFile({
    file,
    entityId,
    entityType: entityType as FileEntityType,
    notes
  });

  return NextResponse.json(asset);
}
