import type { Prisma } from "@prisma/client";
import { DEFAULT_ORG_ID } from "./constants";

// All present owners must agree; an ownerless invoice is not safe to infer.
export const flipsideInvoiceWhere: Prisma.InvoiceWhereInput = {
  AND: [
    { OR: [{ job: { organizationId: DEFAULT_ORG_ID } }, { clientProfile: { organizationId: DEFAULT_ORG_ID } }] },
    { OR: [{ jobId: null }, { job: { organizationId: DEFAULT_ORG_ID } }] },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: DEFAULT_ORG_ID } }] },
  ],
};
export const flipsidePaymentWhere: Prisma.PaymentWhereInput = {
  invoice: flipsideInvoiceWhere,
  OR: [{ clientProfileId: null }, { clientProfile: { organizationId: DEFAULT_ORG_ID } }],
};
