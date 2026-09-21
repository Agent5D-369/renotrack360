
import { staffApiDenial } from "@/lib/staff-access";
import { FileEntityType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeLocalFile } from "@/lib/storage";
import { limitedFileForm, MediaError } from "@/lib/private-media";

export async function POST(request: Request) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await limitedFileForm(request);
    const file = formData.get("file");
    const entityId = String(formData.get("entityId") ?? "");
    const entityType = String(formData.get("entityType") ?? "");
    const notes = String(formData.get("notes") ?? "");

    if (!(file instanceof File) || !entityId || !Object.values(FileEntityType).includes(entityType as FileEntityType)) {
      return NextResponse.json({ error: "file, entityId, and entityType are required" }, { status: 400 });
    }

    const asset = await storeLocalFile({
      file,
      entityId,
      entityType: entityType as FileEntityType,
      notes
    });

    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof MediaError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[private-upload] failed");
    return NextResponse.json({ error: "Unable to store this file." }, { status: 500 });
  }
}
