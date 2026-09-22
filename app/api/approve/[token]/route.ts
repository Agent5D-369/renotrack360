import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { readChangeApproval, decideChangeApproval, ChangeApprovalError } from "@/lib/change-order-ledger";
import { FinancialRecordError } from "@/lib/finance-lock";

const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error: unknown) {
  if (error instanceof ChangeApprovalError) return response({ error: error.message }, error.status);
  if (error instanceof FinancialRecordError) return response({ error: "The project needs a financial review before this response can be applied. Contact Flipside." }, 409);
  return response({ error: "Unable to process this approval. Please contact Flipside." }, 500);
}
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
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
    return response(await decideChangeApproval(prisma, token, body, ip ? createHash("sha256").update(ip).digest("hex").slice(0, 16) : null));
  } catch (error) { return failure(error); }
}
