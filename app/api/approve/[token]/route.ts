import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const approval = await prisma.clientApproval.findUnique({
      where: { token },
      include: {
        estimate: { select: { estimateNumber: true, total: true } },
        selectionItem: { select: { itemName: true } },
      },
    });

    if (!approval) {
      return NextResponse.json({ error: "Approval not found or link expired." }, { status: 404 });
    }

    // Fetch change order if this is a CO approval
    let changeOrderData: { changeOrderTitle: string; addedCost: number; addedTime: number; reason: string | null; jobName: string } | null = null;
    if (approval.approvalType === "CHANGE_ORDER" && approval.changeOrderId) {
      const co = await prisma.changeOrder.findUnique({
        where: { id: approval.changeOrderId },
        include: { job: { include: { organization: true } } },
      });
      if (co) {
        changeOrderData = {
          changeOrderTitle: co.changeOrderTitle,
          addedCost: Number(co.addedCost),
          addedTime: co.addedTime,
          reason: co.reason,
          jobName: co.job.jobName,
        };
      }
    }

    // Mark viewedAt on first load - non-blocking
    if (!approval.viewedAt && !["APPROVED", "DECLINED"].includes(approval.status)) {
      prisma.clientApproval.update({
        where: { token },
        data: { viewedAt: new Date() },
      }).catch(() => {});
    }

    const alreadyActed = ["APPROVED", "DECLINED"].includes(approval.status);

    // Fetch org branding for header
    const orgForBrand = changeOrderData
      ? await prisma.changeOrder.findUnique({ where: { id: approval.changeOrderId! }, include: { job: { include: { organization: { select: { name: true, logoUrl: true, brandColor: true, companyTagline: true } } } } } }).then(co => co?.job.organization)
      : await prisma.organization.findFirst({ select: { name: true, logoUrl: true, brandColor: true, companyTagline: true } });

    return NextResponse.json({
      id: approval.id,
      approvalType: approval.approvalType,
      status: approval.status,
      alreadyActed,
      changeOrderTitle: changeOrderData?.changeOrderTitle,
      addedCost: changeOrderData?.addedCost,
      addedTime: changeOrderData?.addedTime,
      reason: changeOrderData?.reason,
      jobName: changeOrderData?.jobName,
      estimateNumber: approval.estimate?.estimateNumber,
      total: approval.estimate?.total ? Number(approval.estimate.total) : undefined,
      orgName: orgForBrand?.name,
      orgLogoUrl: orgForBrand?.logoUrl ?? null,
      orgBrandColor: orgForBrand?.brandColor ?? null,
      orgTagline: orgForBrand?.companyTagline ?? null,
    });
  } catch (err) {
    console.error("Approval GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { decision, signerName } = await req.json() as { decision: string; signerName: string };

    if (!["approved", "declined"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
    }
    if (!signerName?.trim()) {
      return NextResponse.json({ error: "Signer name is required." }, { status: 400 });
    }

    const approval = await prisma.clientApproval.findUnique({ where: { token } });
    if (!approval) {
      return NextResponse.json({ error: "Approval not found." }, { status: 404 });
    }
    if (["APPROVED", "DECLINED"].includes(approval.status)) {
      return NextResponse.json({ error: "This approval has already been acted on." }, { status: 409 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 16) : undefined;
    const now = new Date();

    await prisma.clientApproval.update({
      where: { token },
      data: {
        status: decision === "approved" ? "APPROVED" : "DECLINED",
        signerName: signerName.trim(),
        signerEmail: approval.signerEmail,
        ipAddressHash: ipHash,
        approvedAt: decision === "approved" ? now : undefined,
        declinedAt: decision === "declined" ? now : undefined,
        viewedAt: approval.viewedAt ?? now,
      },
    });

    // If a change order was approved, update its status
    if (decision === "approved" && approval.changeOrderId) {
      await prisma.changeOrder.update({
        where: { id: approval.changeOrderId },
        data: { status: "APPROVED", approvedDate: now },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Approval POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
