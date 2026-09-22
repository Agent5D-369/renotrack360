import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimateApprovalDocument } from "@/lib/estimate-acceptance";
import { storageRoot } from "@/lib/private-media";
import { ChangeApprovalError } from "@/lib/change-order-ledger";
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params, { bytes } = await estimateApprovalDocument(prisma, token, await storageRoot());
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="flipside-reviewed-proposal.pdf"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) { return NextResponse.json({ error: "The reviewed proposal document is unavailable. Contact Flipside." }, { status: error instanceof ChangeApprovalError ? error.status : 409, headers: { "Cache-Control": "private, no-store" } }); }
}
