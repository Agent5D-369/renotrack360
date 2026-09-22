
import { requireStaff, staffApiDenial } from "@/lib/staff-access";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

export async function POST(request: Request) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const actor = await requireStaff();

  const formData = await request.formData();
  const file = formData.get("logo");
  if (!(file instanceof File)) return NextResponse.json({ error: "No logo file provided." }, { status: 400 });

  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported format. Upload a PNG, JPG, WebP, or SVG." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large. Maximum size is 3 MB." }, { status: 400 });
  }

  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json(
      { error: "Logo uploads are unavailable. You can use a public logo URL in company settings." },
      { status: 503 }
    );
  }

  const { v2: cloudinary } = await import("cloudinary");
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: `renotrack360/logos/${actor.organizationId}`,
        resource_type: "image",
        transformation: [{ width: 800, crop: "limit" }] // cap upload resolution
      },
      (err, res) => (err ? reject(err) : resolve(res!))
    ).end(buffer);
  });

  await prisma.organization.update({
    where: { id: actor.organizationId },
    data: { logoUrl: result.secure_url }
  });

  return NextResponse.json({ url: result.secure_url });
}

export async function DELETE() {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const actor = await requireStaff();

  await prisma.organization.update({
    where: { id: actor.organizationId },
    data: { logoUrl: null }
  });
  return NextResponse.json({ ok: true });
}
