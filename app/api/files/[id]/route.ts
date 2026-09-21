import { staffApiDenial, requireStaff } from "@/lib/staff-access";
import { prisma } from "@/lib/prisma";
import { MediaError, readPrivateAsset, storageRoot } from "@/lib/private-media";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  try {
    const actor = await requireStaff();
    const { id } = await params;
    const { asset, bytes } = await readPrivateAsset(prisma, actor, id, await storageRoot());
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${asset.mimeType.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch (error) {
    if (error instanceof MediaError) return Response.json({ error: error.message }, { status: error.status });
    console.error("[private-download] failed");
    return Response.json({ error: "Unable to retrieve this file." }, { status: 500 });
  }
}
