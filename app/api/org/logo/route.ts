import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      { error: "File storage is not configured. Set CLOUDINARY_URL in Railway environment variables to enable logo uploads." },
      { status: 503 }
    );
  }

  const { v2: cloudinary } = await import("cloudinary");
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "renotrack360/logos",
        resource_type: "image",
        transformation: [{ width: 800, crop: "limit" }] // cap upload resolution
      },
      (err, res) => (err ? reject(err) : resolve(res!))
    ).end(buffer);
  });

  await prisma.organization.update({
    where: { id: DEFAULT_ORG_ID },
    data: { logoUrl: result.secure_url }
  });

  return NextResponse.json({ url: result.secure_url });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.organization.update({
    where: { id: DEFAULT_ORG_ID },
    data: { logoUrl: null }
  });
  return NextResponse.json({ ok: true });
}
