# RenoTech360 Command Center Product Brief

RenoTech360 Command Center is a contractor operating platform for renovation companies that need one connected system from lead intake through closeout. It combines CRM, property tracking, field quote collection, estimate generation, cost catalog intelligence, project execution, phase/task control, client reporting, change orders, invoicing, payments, selections, vendor compliance, and future AI assistance.

## Product Positioning

RenoTech360 is built for renovation contractors who need the speed of Joist-style estimating, the planning discipline of Homewyse-style scope breakdowns, and the operational control of construction project-management software without forcing field crews into enterprise complexity.

The product promise is: capture better information in the field, produce clearer estimates, follow up consistently, execute jobs through a repeatable renovation order of operations, document every decision, and protect margin with disciplined scope/change-order workflows.

## Core Users

- Owner/operator: monitors pipeline, profitability, invoices, change orders, and company settings.
- Estimator: uses the mobile Quote Wizard, cost catalog, service templates, and estimate follow-up tools.
- Project manager: deploys job templates, assigns tasks, monitors phases, reports weekly, and manages blockers.
- Field crew/subcontractor: uses My Day, phase tasks, proof photos, field reporting, and blocker reporting.
- Admin/bookkeeper: tracks invoices, payments, W-9s, agreements, reimbursements, and compliance.
- Client/owner/investor: future client portal user for approvals, selections, reports, and closeout packets.

## Main Feature Areas

### Today

The Today page is the operating cockpit. It surfaces estimate follow-ups, relationship follow-ups, reports due, open change orders, invoice exposure, pipeline value, and active job watchlists. Items link directly to their source records, and the app now shows a visible loading state after navigation.

### Profiles

Profiles are the relationship center. Each person or organization can be classified by type, client status, company relationship, service tags, W-9/compliance status, and relationship scores. Profiles connect to leads, properties, quotes, jobs, financing, activities, and related profiles so duplicate records are avoided.

### Leads

Leads track opportunities through pipeline stages with budget, urgency, owner/rep assignment, probability, scope clarity, financing need, follow-up date, and next action. The lead priority formula supports high-value follow-up discipline.

### Properties

Properties are address-specific renovation records with owner/investor/agent relationships, property type, condition, renovation goal, ARV, risk notes, and related leads, quotes, and jobs.

### Quote Wizard

The mobile-first Quote Wizard replaces paper field estimate sheets. It supports client/property selection, autosaved drafts, material responsibility, standard scope checks, room-by-room measurements, bathrooms/bedrooms/outdoor kitchen support, cabinet planning, allowances with units/basis, risk notes, and browser voice capture where supported.

### Cost Catalog and Service Templates

The original RenoTech Cost Catalog stores editable low/target/high planning costs, labor/material assumptions, risk factors, permit triggers, trade requirements, and internal pricing notes. Service templates add step-by-step scope language, quote sections, task templates, invoice milestones, and evidence requirements so estimates can become executable work.

### Estimates and Follow-Up

Estimates are generated from quotes with readiness/confidence indicators, terms, totals, PDF export, and follow-up sequences. This directly attacks one of the biggest contractor pain points: vague bids that are hard to track after sending.

### Jobs and Construction Order of Operations

Jobs are organized by the RenoTech360 construction order of operations:

1. Site Prep
2. Demo
3. Exterior
4. Rough Framing
5. Rough Electric
6. Rough Plumbing
7. Rough HVAC
8. Sec. Framing / Insulation
9. Wall Covering
10. Paint
11. Flooring
12. Cabinets / Counters
13. Trim
14. Punch List / Clean Up

Each phase includes guidance, completion criteria, computed status from linked tasks, and an add-task control. Job status remains an editable business-level status; the next open phase is computed from phase/task progress.

### Project Task Templates

Common renovation templates can deploy ordered starter tasks into a job. Current templates include Kitchen Refresh, Bathroom Renovation, and Full Interior Renovation. The design direction is to store and manage these as editable database templates for tenant-specific operating systems.

### Weekly Reports

Weekly reports produce client-facing updates with work completed, issues found, decisions needed, budget notes, schedule notes, next-week plan, and PDF export. They are designed for remote investors and absent homeowners who need trust-building visibility.

### Change Orders

Change orders document reason, field condition, client request status, cost impact, schedule impact, approval status, photos, and signature notes. Approved change orders increase job contract value and protect profitability.

### Invoices, Payments, and Financing

Invoices track deposits, progress payments, final payments, Stripe payment links when configured, balances, and PDF export. Payments record method, status, payment date, and invoice application. Financing is tracked as a third-party workflow only, not a fake lending integration.

### Selections and Client Collaboration

Selection sheets track room, category, allowance, target budget, vendor/SKU/link, options, client approval, price variance, schedule impact, procurement status, and change-order triggers.

### Operations, Compliance, and Resources

The system includes groundwork for crew assignments, timesheets, reimbursements, materials, tools/equipment, safety audits, incidents, permits, W-9 tracking, subcontractor agreements, imports, and feedback/review loops.

### AI Team

The AI architecture is provider-agnostic and prepared for OpenAI, Anthropic, Google, Azure OpenAI, OpenRouter, and custom endpoints. AI tasks should draft and review, not autonomously send pricing or client communications. Future agents can assist with estimate review, follow-ups, weekly reports, risk detection, translations, review requests, and support.

## Design Principles

- Mobile-first field capture.
- Every major record has detail and edit paths.
- Every task belongs to a job and ideally a phase.
- Every client-facing claim should connect back to scope, proof, approval, or source record.
- Placeholder integrations must be visibly marked until real credentials/providers are configured.
- Multi-tenant SaaS readiness should stay in the data model without overcomplicating the MVP.
