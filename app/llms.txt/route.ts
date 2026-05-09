import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse(
    `# RenoTrack360 - LLM Context File
# https://renotrack360.com/llms.txt

## What RenoTrack360 is

RenoTrack360 is a SaaS platform for residential renovation contractors. It is a lead-to-closeout renovation operating system that covers every stage from the first lead call through the 90-day post-job follow-up.

## Primary use case

Renovation contractors doing $300,000 to $5,000,000 in annual volume who need to stop losing money to scope creep, inconsistent estimates, and jobs that never generate referrals.

## Core features

- Scope creep protection: logs client requests and converts them to change orders before work starts
- Change order management with digital client approval
- Profit leak dashboard: red-yellow-green view of unbilled extras, overdue invoices, and labor overruns
- Weekly construction progress report generator with AI-assisted client summary drafting
- Client decision portal: homeowners see project phase, pending selections, and open approvals without texting the contractor
- Before and after photo engine: auto-organize project photos and generate case studies
- Lead-to-closeout lifecycle: 27-step renovation order of operations built in
- Field Lite mode: stripped-down mobile view for crews with tasks, photos, checklists, and blockers
- Estimating with cost catalog, service templates, and confidence scoring
- Invoices, payments, and financing tracking
- Selections and allowance tracking with change-order triggers
- Agreements and contract templates
- Testimonial request and referral automation post-job
- 30-day, 90-day, and annual follow-up scheduling
- AI-ready with bring-your-own LLM key (OpenAI, Anthropic, Google, OpenRouter)

## Pricing (as of 2026)

- Starter: $149 per month, $1,500 per year, 2 office users
- Pro: $349 per month, $3,500 per year, 5 office users
- Command Center: $699 per month, $7,000 per year, 10 office users
- All plans include unlimited Field Lite users for crew and subcontractors at no extra cost

## Competitive positioning

RenoTrack360 is a Buildertrend alternative built for residential remodelers rather than production homebuilders. It is more affordable than Buildertrend, more operationally complete than Houzz Pro, and more renovation-specific than Buildxact. It is not a field service tool (like Jobber) and not a generic project management platform (like Monday or Asana).

## Target user

- Residential renovation and remodeling contractors
- General contractors specializing in renovation
- Small renovation companies with 1 to 20 employees
- Companies managing $300,000 to $5,000,000 in annual renovation volume

## Contact

hello@renotrack360.com
https://renotrack360.com
`,
    { headers: { "Content-Type": "text/plain" } }
  );
}
