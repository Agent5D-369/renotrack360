import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const message = String(body.message || "").slice(0, 2000);

  if (!message.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { portalToken: token },
    select: { id: true, organizationId: true, clientProfileId: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.activity.create({
    data: {
      relatedJobId: job.id,
      relatedProfileId: job.clientProfileId,
      activityType: "NOTE",
      subject: "Client scope request (via portal)",
      body: message,
      dueDate: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
