import { z } from "zod";

const optionalNumber = z.coerce.number().optional().nullable();
const optionalDate = z.coerce.date().optional().nullable();
const optionalText = z.string().trim().optional().nullable();

export const profileSchema = z.object({
  profileName: z.string().min(2),
  profileKind: z.string().min(1).default("PERSON"),
  profileType: z.string().min(1),
  clientStatus: z.string().min(1).default("PROSPECT"),
  companyName: optionalText,
  companyProfileId: optionalText,
  phone: optionalText,
  email: z.string().email().optional().or(z.literal("")),
  website: optionalText,
  location: optionalText,
  source: optionalText,
  relationshipStrength: z.coerce.number().min(0).max(100),
  trustLevel: z.coerce.number().min(0).max(100),
  leadPotential: z.coerce.number().min(0).max(100),
  referralPotential: z.coerce.number().min(0).max(100),
  notes: optionalText,
  nextFollowUp: optionalDate,
  w9Status: z.string().min(1).default("NOT_REQUIRED"),
  w9RequestedAt: optionalDate,
  w9ReceivedAt: optionalDate,
  w9FileAssetId: optionalText,
  vendorOnboardingStatus: z.string().min(1).default("NOT_STARTED"),
  insuranceExpiration: optionalDate,
  complianceNotes: optionalText
});

export const leadSchema = z.object({
  leadName: z.string().min(2),
  leadType: optionalText,
  source: optionalText,
  ownerUserId: optionalText,
  relatedProfileId: optionalText,
  relatedPropertyId: optionalText,
  estimatedBudget: optionalNumber,
  urgency: z.coerce.number().min(0).max(100),
  jobFitScore: z.coerce.number().min(0).max(100),
  trustFitScore: z.coerce.number().min(0).max(100),
  scopeClarity: z.coerce.number().min(0).max(100),
  financingNeed: z.coerce.boolean().default(false),
  probability: z.coerce.number().min(0).max(100),
  nextAction: optionalText,
  followUpDate: optionalDate,
  status: z.string().min(1),
  notes: optionalText
});

export const propertySchema = z.object({
  propertyAddress: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(0).max(50).default(""),
  zip: z.string().min(0).max(20).default(""),
  country: z.string().min(2).max(10).default("US"),
  propertyType: z.string().min(1),
  occupancyStatus: optionalText,
  ownerType: optionalText,
  listingStatus: optionalText,
  agentProfileId: optionalText,
  investorProfileId: optionalText,
  estimatedARV: optionalNumber,
  currentCondition: optionalText,
  renovationGoal: optionalText,
  riskNotes: optionalText
});

export const quoteSchema = z.object({
  quoteName: z.string().min(2),
  clientProfileId: optionalText,
  propertyId: optionalText,
  leadId: optionalText,
  quoteStatus: z.string().min(1),
  targetSendDate: optionalDate,
  projectType: optionalText,
  budgetRange: optionalText,
  siteVisitRequired: z.coerce.boolean().default(true),
  paidSiteVisit: z.coerce.boolean().default(false),
  consultationFee: optionalNumber,
  permitLikely: z.coerce.boolean().default(false),
  riskLevel: z.string().min(1),
  gcMarkup: z.coerce.number().min(0),
  contingency: z.coerce.number().min(0),
  finalQuoteAmount: optionalNumber,
  notes: optionalText
});

export const quoteLineItemSchema = z.object({
  quoteId: z.string().min(1),
  scopeArea: z.string().min(2),
  costCatalogItemId: optionalText,
  lineItemName: z.string().min(2),
  unitType: z.string().min(1),
  quantity: z.coerce.number().min(0),
  laborLow: z.coerce.number().min(0),
  laborTarget: z.coerce.number().min(0),
  laborHigh: z.coerce.number().min(0),
  materialLow: z.coerce.number().min(0),
  materialTarget: z.coerce.number().min(0),
  materialHigh: z.coerce.number().min(0),
  subcontractorCost: z.coerce.number().min(0),
  markupPercent: z.coerce.number().min(0),
  riskFactor: z.string().min(1),
  clientFacingDescription: optionalText,
  internalNotes: optionalText
});

export const catalogSchema = z.object({
  category: z.string().min(2),
  serviceName: z.string().min(2),
  unitType: z.string().min(1),
  typicalQuantityRange: optionalText,
  flipsideLowCost: z.coerce.number().min(0),
  flipsideTargetCost: z.coerce.number().min(0),
  flipsideHighCost: z.coerce.number().min(0),
  laborAssumptions: optionalText,
  materialAssumptions: optionalText,
  laborRange: optionalText,
  materialRange: optionalText,
  markup: z.coerce.number().min(0),
  riskFactor: z.string().min(1),
  complexityLevel: optionalText,
  permitTrigger: optionalText,
  licensedTradeRequired: z.coerce.boolean().default(false),
  austinNotes: optionalText,
  referenceUrl: optionalText,
  vendorQuoteNotes: optionalText,
  projectHistoryNotes: optionalText,
  internalPricingNotes: optionalText,
  active: z.coerce.boolean().default(true)
});

export const jobSchema = z.object({
  jobName: z.string().min(2),
  clientProfileId: optionalText,
  propertyId: optionalText,
  approvedQuoteId: optionalText,
  jobStatus: z.string().min(1),
  startDate: optionalDate,
  targetCompletion: optionalDate,
  contractAmount: z.coerce.number().min(0),
  amountPaid: z.coerce.number().min(0),
  activePhase: optionalText,
  weeklyReportDue: optionalDate,
  permitStatus: optionalText,
  riskLevel: z.string().min(1),
  notes: optionalText
});

export const taskSchema = z.object({
  taskName: z.string().min(2),
  jobId: z.string().min(1),
  phaseId: optionalText,
  assignedToProfileId: optionalText,
  dueDate: optionalDate,
  status: z.string().min(1),
  priority: z.string().min(1),
  notes: optionalText
});

export const weeklyReportSchema = z.object({
  jobId: z.string().min(1),
  weekEnding: z.coerce.date(),
  workCompleted: z.string().min(2),
  issuesFound: optionalText,
  decisionsNeeded: optionalText,
  budgetNotes: optionalText,
  scheduleNotes: optionalText,
  nextWeekPlan: optionalText,
  clientSummary: optionalText,
  internalNotes: optionalText
});

export const changeOrderSchema = z.object({
  jobId: z.string().min(1),
  clientProfileId: optionalText,
  changeOrderTitle: z.string().min(2),
  reason: optionalText,
  clientRequested: z.coerce.boolean().default(false),
  fieldCondition: optionalText,
  addedCost: z.coerce.number().min(0),
  addedTime: z.coerce.number().min(0),
  status: z.string().min(1),
  signatureApprovalNotes: optionalText
});

export const invoiceSchema = z.object({
  jobId: optionalText,
  clientProfileId: optionalText,
  invoiceNumber: z.string().min(2),
  dueDate: optionalDate,
  subtotal: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
  amountPaid: z.coerce.number().min(0).default(0),
  status: z.string().min(1),
  notes: optionalText
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  clientProfileId: optionalText,
  amount: z.coerce.number().min(0),
  paymentDate: z.coerce.date(),
  method: z.string().min(1),
  stripePaymentIntentId: optionalText,
  status: z.string().min(1),
  notes: optionalText
});

export const financingSchema = z.object({
  clientProfileId: optionalText,
  quoteId: optionalText,
  jobId: optionalText,
  financingNeeded: z.coerce.boolean().default(false),
  desiredAmount: optionalNumber,
  status: z.string().min(1),
  provider: optionalText,
  applicationUrl: optionalText,
  notes: optionalText
});

export const estimateSchema = z.object({
  status: z.string().min(1),
  confidenceLevel: z.string().min(1),
  confidenceScore: z.coerce.number().min(0).max(100),
  readinessScore: z.coerce.number().min(0).max(100),
  scopeClarity: z.coerce.number().min(0).max(100),
  expirationDate: optionalDate,
  nextFollowUpDue: optionalDate,
  clientFacingSummary: optionalText,
  internalRiskNotes: optionalText,
  notes: optionalText,
  terms: optionalText
});

export const budgetLineSchema = z.object({
  jobId: z.string().min(1),
  lineType: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  estimatedAmount: z.coerce.number().min(0),
  committedAmount: z.coerce.number().min(0).optional().default(0),
  actualAmount: z.coerce.number().min(0).optional().default(0),
  notes: optionalText
});

export const actualCostSchema = z.object({
  jobId: z.string().min(1),
  costType: z.string().min(1),
  description: z.string().min(1),
  estimatedAmount: z.coerce.number().min(0).optional(),
  actualAmount: z.coerce.number().min(0),
  notes: optionalText
});

export const settingsSchema = z.object({
  name: z.string().min(2),
  country: z.string().min(2).max(10).default("US"),
  address: optionalText,
  phone: optionalText,
  email: optionalText,
  website: optionalText,
  logoUrl: optionalText,
  brandColor: optionalText,
  brandSecondaryColor: optionalText,
  companyTagline: optionalText,
  reviewLink: optionalText,
  defaultMarkup: z.coerce.number().min(0),
  defaultContingency: z.coerce.number().min(0),
  themePreference: z.string().min(2)
});

export const settingsTermsSchema = z.object({
  paymentTerms: z.string().min(2),
  estimateTerms: z.string().min(2),
  invoiceTerms: z.string().min(2),
  weeklyReportFooter: z.string().min(2)
});
