import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { readChangeApproval, decideChangeApproval, ChangeApprovalError } from "@/lib/change-order-ledger";
import { FinancialRecordError } from "@/lib/finance-lock";
import { readEstimateApproval, decideEstimateApproval } from "@/lib/estimate-acceptance";
import { storageRoot, MediaError } from "@/lib/private-media";
import { FLIPSIDE_NAME, FLIPSIDE_LOGO } from "@/lib/flipside-brand";

const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error: unknown) {
  if (error instanceof ChangeApprovalError) return response({ error: error.message }, error.status);
  if (error instanceof MediaError) return response({ error: "The proposal document could not be verified. Contact your contractor." }, 409);
  if (error instanceof FinancialRecordError) return response({ error: "The project needs a financial review before this response can be applied. Contact your contractor." }, 409);
  return response({ error: "Unable to process this approval. Please contact your contractor." }, 500);
}
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (/^[a-f0-9]{64}$/.test(token) && (await prisma.clientApproval.findUnique({ where: { token }, select: { approvalType: true } }))?.approvalType === "ESTIMATE") {
      const { approval, snapshot, content } = await readEstimateApproval(prisma, token);
      const { quoteId, clientProfileId, propertyId, ...publicContent } = content;
      // Branding belongs to the company that owns this estimate, not to the platform default.
      const org = await prisma.organization.findUnique({ where: { id: snapshot.organizationId }, select: { name: true, logoUrl: true, brandColor: true, companyTagline: true } });
      const branding = org
        ? { orgName: org.name, orgLogoUrl: org.logoUrl, orgBrandColor: org.brandColor, orgTagline: org.companyTagline }
        : { orgName: FLIPSIDE_NAME, orgLogoUrl: FLIPSIDE_LOGO, orgBrandColor: "#171717", orgTagline: null };
      return response({ ...publicContent, total: Number(content.total), approvalType: "ESTIMATE", id: approval.id, status: approval.status, alreadyActed: ["APPROVED", "DECLINED"].includes(approval.status), reviewedDigest: snapshot.contentDigest, expiresAt: snapshot.expiresAt.toISOString(), documentUrl: `/api/approve/${token}/document`, ...branding, scheduleNote: `Acceptance records this proposal. ${branding.orgName} will confirm scheduling after the documented deposit and preconstruction requirements are satisfied.` });
    }
    const { approval, snapshot, content } = await readChangeApproval(prisma, token);
    const org = snapshot.job.organization;
    return response({ id: approval.id, approvalType: "CHANGE_ORDER", status: approval.status, alreadyActed: ["APPROVED", "DECLINED"].includes(approval.status),
      ...content, addedCost: Number(content.addedCost), reviewedDigest: snapshot.contentDigest, expiresAt: snapshot.expiresAt.toISOString(),
      orgName: org.name, orgLogoUrl: org.logoUrl, orgBrandColor: org.brandColor, orgTagline: org.companyTagline });
  } catch (error) { return failure(error); }
}
async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ChangeApprovalError("A response is required.", 400);
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength;
      if (size > 16384) { await reader.cancel(); throw new ChangeApprovalError("Approval response is too large.", 413); } chunks.push(next.value); }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ChangeApprovalError("Invalid approval response.", 400); }
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params, body = await boundedBody(req);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    if (/^[a-f0-9]{64}$/.test(token) && (await prisma.clientApproval.findUnique({ where: { token }, select: { approvalType: true } }))?.approvalType === "ESTIMATE") return response(await decideEstimateApproval(prisma, token, body, await storageRoot(), ip ? createHash("sha256").update(ip).digest("hex").slice(0, 16) : null));
    return response(await decideChangeApproval(prisma, token, body, ip ? createHash("sha256").update(ip).digest("hex").slice(0, 16) : null));
  } catch (error) { return failure(error); }
}
