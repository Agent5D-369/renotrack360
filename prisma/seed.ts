import { PrismaClient, RiskLevel } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { catalogCategories, DEFAULT_ORG_ID, renovationPhaseDetails, renovationPhases } from "../lib/constants";
import { calculateLineItem, calculateQuoteTotals } from "../lib/calculations";

loadLocalEnv();

const prisma = new PrismaClient();

// Wipe all org-specific created data so the seed is fully idempotent.
// Runs before every create block — produces exactly one clean copy each run.
async function resetOrgData(orgId: string) {
  // AI layer
  await prisma.aiTask.deleteMany({ where: { organizationId: orgId } });
  await prisma.aiAgent.deleteMany({ where: { organizationId: orgId } });

  // Translation + import records
  await prisma.translationRecord.deleteMany({ where: { organizationId: orgId } });
  await prisma.importJob.deleteMany({ where: { organizationId: orgId } });

  // Vendor quotes and actual costs
  await prisma.vendorQuote.deleteMany({ where: { organizationId: orgId } });
  await prisma.actualCost.deleteMany({ where: { organizationId: orgId } });

  // Activities
  await prisma.activity.deleteMany({ where: { profile: { organizationId: orgId } } });

  // Financing (before profile/quote)
  await prisma.financing.deleteMany({ where: { clientProfile: { organizationId: orgId } } });

  // Payments before invoices
  await prisma.payment.deleteMany({ where: { clientProfile: { organizationId: orgId } } });
  await prisma.invoice.deleteMany({ where: { clientProfile: { organizationId: orgId } } });

  // Weekly reports and change orders before job
  await prisma.weeklyReport.deleteMany({ where: { job: { organizationId: orgId } } });
  await prisma.changeOrder.deleteMany({ where: { job: { organizationId: orgId } } });

  // Team circles before profiles
  await prisma.teamCircle.deleteMany({ where: { organizationId: orgId } });

  // Job — cascades: phases, tasks, fieldReports, budgetLines, meetings, timeEntries,
  // reimbursements, permits, safetyAudits, incidents, materialRequests, fieldAssignments,
  // clientPortalUpdates, feedbackRequests, jobPhotos, selectionSheets, agreements
  await prisma.job.deleteMany({ where: { organizationId: orgId } });

  // Estimate children before estimates
  await prisma.clientApproval.deleteMany({ where: { estimate: { quote: { organizationId: orgId } } } });

  // Leads and quotes (cascade: lineItems, estimates + their children)
  await prisma.lead.deleteMany({ where: { organizationId: orgId } });
  await prisma.quote.deleteMany({ where: { organizationId: orgId } });

  // Profile relations before profile
  await prisma.profileRelationship.deleteMany({ where: { fromProfile: { organizationId: orgId } } });
  await prisma.profile.deleteMany({ where: { organizationId: orgId } });

  // Properties
  await prisma.property.deleteMany({ where: { organizationId: orgId } });

  // Cost catalog
  await prisma.costAssembly.deleteMany({ where: { organizationId: orgId } });
  await prisma.costCatalogItem.deleteMany({ where: { organizationId: orgId } });
  await prisma.serviceTemplate.deleteMany({ where: { organizationId: orgId } });

  // Financial reference data
  await prisma.laborRate.deleteMany({ where: { organizationId: orgId } });
  await prisma.materialAllowance.deleteMany({ where: { organizationId: orgId } });
  await prisma.marketCostFactor.deleteMany({ where: { organizationId: orgId } });

  // Physical assets (assignments cascade from job deletion above)
  await prisma.equipmentAsset.deleteMany({ where: { organizationId: orgId } });
  await prisma.toolAsset.deleteMany({ where: { organizationId: orgId } });
  await prisma.materialItem.deleteMany({ where: { organizationId: orgId } });

  // ChecklistRuns must go before ChecklistTemplates (RESTRICT FK)
  await prisma.checklistRun.deleteMany({ where: { template: { organizationId: orgId } } });

  // Templates and operational config
  await prisma.safetyAuditTemplate.deleteMany({});
  await prisma.projectTemplate.deleteMany({ where: { organizationId: orgId } });
  await prisma.checklistTemplate.deleteMany({ where: { organizationId: orgId } });
  await prisma.agreementTemplate.deleteMany({ where: { organizationId: orgId } });
}

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {
      weeklyReportFooter: "Prepared by Flipside Renovations · RenoTrack360 job management."
    },
    create: {
      id: DEFAULT_ORG_ID,
      name: "Flipside Renovations",
      address: "Austin, TX",
      phone: "(512) 555-0147",
      email: "operations@flipsiderenovations.test",
      website: "https://example.com",
      weeklyReportFooter: "Prepared by Flipside Renovations · RenoTrack360 job management."
    }
  });

  // Wipe all previous seeded data so this run starts clean
  await resetOrgData(org.id);

  const email = process.env.ADMIN_EMAIL?.toLowerCase() ?? "owner@flipsiderenovations.test";
  const password = process.env.ADMIN_PASSWORD ?? "change-me";

  // Demo user — always created so demo login works on Railway
  const demoEmail = (process.env.DEMO_USER_EMAIL ?? "demo@renotrack360.com").toLowerCase();
  const demoPassword = process.env.DEMO_USER_PASSWORD ?? "LiveDemo2025";
  await prisma.user.upsert({
    where: { email: demoEmail },
    update: { organizationId: org.id },
    create: {
      email: demoEmail,
      name: "Demo User",
      role: "ADMIN",
      organizationId: org.id,
      passwordHash: await bcrypt.hash(demoPassword, 10)
    }
  });
  await prisma.profile.updateMany({
    where: { organizationId: org.id, notes: "Fictional seed profile for renovation relationship tracking." },
    data: { notes: "Flipside Renovations contact. Scores reflect relationship strength, trust, lead potential, and referral value." }
  });
  await prisma.user.upsert({
    where: { email },
    update: { organizationId: org.id },
    create: {
      email,
      name: "Marcus Webb",
      role: "OWNER",
      organizationId: org.id,
      passwordHash: await bcrypt.hash(password, 10)
    }
  });
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: org.id } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: { userId: adminUser.id, organizationId: org.id, role: "OWNER", status: "ACTIVE", acceptedAt: new Date() }
  });
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: { planTier: "PRO", status: "TRIALING" },
    create: {
      organizationId: org.id,
      planTier: "PRO",
      status: "TRIALING",
      activeJobLimit: 25,
      monthlyEstimateLimit: 250,
      userLimit: 8,
      notes: "Seeded future SaaS subscription record for Joist-style plan enforcement."
    }
  });

  const aiProviderSeeds = [
    ["OPENAI", "OpenAI", "gpt-4.1-mini", "Best default for estimate review, follow-up drafting, structured extraction, and support chat."],
    ["ANTHROPIC", "Anthropic Claude", "claude-3-5-sonnet-latest", "Strong long-context review for contracts, SOWs, and weekly report drafting."],
    ["GOOGLE", "Google Gemini", "gemini-1.5-pro", "Useful alternative for multimodal document/photo workflows when configured."],
    ["OPENROUTER", "OpenRouter", "", "Optional model router for tenant-selected providers and fallback experiments."],
    ["AZURE_OPENAI", "Azure OpenAI", "", "Enterprise deployment option for tenants that require Azure controls."],
    ["LOCAL_CUSTOM", "Local / custom endpoint", "", "Future option for self-hosted or private gateway deployments."]
  ] as const;

  for (const [provider, displayName, defaultModel, notes] of aiProviderSeeds) {
    await prisma.aiProviderConfig.upsert({
      where: { organizationId_provider: { organizationId: org.id, provider } },
      update: { displayName, defaultModel, notes },
      create: {
        organizationId: org.id,
        provider,
        displayName,
        defaultModel: defaultModel || null,
        enabled: false,
        apiKeySecretRef: null,
        allowClientData: false,
        dataRetentionMode: "tenant-controlled",
        notes
      }
    });
  }

  const serviceTags = [
    ["Electrical", "Trade"],
    ["Panel upgrades", "Electrical"],
    ["Lighting", "Electrical"],
    ["Plumbing", "Trade"],
    ["Fixture install", "Plumbing"],
    ["Tile", "Finish trade"],
    ["Flooring", "Finish trade"],
    ["Painting", "Finish trade"],
    ["Drywall", "Interior"],
    ["Framing", "Carpentry"],
    ["Trim carpentry", "Carpentry"],
    ["Cabinets", "Finish trade"],
    ["Countertops", "Finish trade"],
    ["Roofing", "Exterior"],
    ["Windows and doors", "Exterior"],
    ["Landscaping", "Exterior"],
    ["HVAC", "Mechanical"],
    ["Permitting support", "Professional service"],
    ["Design selections", "Professional service"],
    ["Commercial buildout", "Client type"]
  ] as const;

  for (const [name, category] of serviceTags) {
    await prisma.serviceTag.upsert({
      where: { organizationId_name: { organizationId: org.id, name } },
      update: { category, active: true },
      create: { organizationId: org.id, name, category, description: `Tag profiles that provide or need ${name.toLowerCase()} work.` }
    });
  }

  const dropdownSeeds = [
    ["leadType", "Residential remodel"],
    ["leadType", "Commercial buildout"],
    ["leadType", "Investor turn"],
    ["leadType", "Listing prep"],
    ["leadType", "Insurance repair"],
    ["projectType", "Kitchen remodel"],
    ["projectType", "Bathroom remodel"],
    ["projectType", "Full interior renovation"],
    ["projectType", "Exterior repair"],
    ["projectType", "Commercial tenant improvement"],
    ["leadSource", "Referral"],
    ["leadSource", "Agent"],
    ["leadSource", "Website"],
    ["leadSource", "Past client"],
    ["leadSource", "Property manager"]
  ] as const;

  for (const [optionSet, label] of dropdownSeeds) {
    await prisma.dropdownOption.upsert({
      where: { organizationId_optionSet_value: { organizationId: org.id, optionSet, value: label.toLowerCase().replaceAll(" ", "_") } },
      update: { label, active: true, system: true },
      create: {
        organizationId: org.id,
        optionSet,
        label,
        value: label.toLowerCase().replaceAll(" ", "_"),
        system: true,
        description: `Admin-manageable ${optionSet} option.`
      }
    });
  }

  const profileNames = [
    ["Sarah Hartmann", "HOMEOWNER", null],
    ["Diego Vega", "AGENT", "Hill Country Realty"],
    ["Nina Okafor", "HOMEOWNER", null],
    ["James Lindqvist", "ARCHITECT", "Lindqvist Design Co"],
    ["Priya Desai", "DESIGNER", "Studio Desai"],
    ["Rachel Torres", "PROPERTY_MANAGER", "Capitol City PM"],
    ["Ben Whitaker", "VENDOR_SUBCONTRACTOR", "Whitaker Tile"],
    ["Carol Park", "PAST_CLIENT", null],
    ["Andre King", "INVESTOR", "King Capital Holdings"],
    ["Helena Ruiz", "AGENT", "Central Austin Listings"]
  ] as const;

  const profiles = [];
  for (const [index, row] of profileNames.entries()) {
    const profile = await prisma.profile.create({
      data: {
        organizationId: org.id,
        profileName: row[0],
        profileKind: row[1] === "VENDOR_SUBCONTRACTOR" ? "ORGANIZATION" : "PERSON",
        profileType: row[1],
        clientStatus: row[1] === "PAST_CLIENT" ? "PAST_CLIENT" : row[1] === "HOMEOWNER" || row[1] === "INVESTOR" ? "PROSPECT" : "NOT_CLIENT",
        companyName: row[2],
        phone: `(512) 555-01${String(index).padStart(2, "0")}`,
        email: `${row[0].toLowerCase().replaceAll(" ", ".")}@example.test`,
        location: "Austin, TX",
        source: index % 2 === 0 ? "Referral" : "Networking",
        relationshipStrength: 55 + index * 3,
        trustLevel: 58 + index * 2,
        leadPotential: 50 + index * 4,
        referralPotential: 48 + index * 4,
        notes: `${row[0]} — Flipside Renovations contact. Scores reflect relationship strength, trust, lead potential, and referral value.`
      }
    });
    profiles.push(profile);
  }

  const properties = [];
  const propertyRows = [
    ["1412 Hartmann Ave", "Austin", "TX", "78704", "SINGLE_FAMILY_HOME", 785000, "Full kitchen and primary bath renovation"],
    ["804 Red River Unit 4B", "Austin", "TX", "78701", "CONDO", 495000, "Investor rental modernization"],
    ["3410 Cedar Ridge Ln", "Round Rock", "TX", "78664", "DUPLEX", 630000, "Value-add duplex - both units"],
    ["2218 Mesa Vista Dr", "Austin", "TX", "78731", "LUXURY_HOME", 1380000, "Kitchen expansion and bath suite"],
    ["619 East 6th St", "Austin", "TX", "78702", "STALE_LISTING", 695000, "Pre-list renovation rescue"]
  ] as const;
  for (const [index, row] of propertyRows.entries()) {
    properties.push(
      await prisma.property.create({
        data: {
          organizationId: org.id,
          propertyAddress: row[0],
          city: row[1],
          state: row[2],
          zip: row[3],
          propertyType: row[4],
          occupancyStatus: index % 2 === 0 ? "Vacant" : "Occupied",
          ownerType: index % 2 === 0 ? "Investor" : "Homeowner",
          listingStatus: index === 4 ? "Stale listing" : "Off market",
          agentProfileId: profiles[1].id,
          investorProfileId: profiles[index % profiles.length].id,
          estimatedARV: row[5],
          currentCondition: "Needs coordinated scope review",
          renovationGoal: row[6],
          riskNotes: "Verify existing conditions before final pricing."
        }
      })
    );
  }

  const catalogItems = [];
  for (const [catIndex, category] of catalogCategories.entries()) {
    for (let i = 1; i <= 3; i++) {
      const base = 175 + catIndex * 42 + i * 120;
      catalogItems.push(
        await prisma.costCatalogItem.create({
          data: {
            organizationId: org.id,
            category,
            serviceName: `${category} planning item ${i}`,
            unitType: i === 1 ? "each" : i === 2 ? "sq ft" : "linear ft",
            typicalQuantityRange: i === 1 ? "1-4" : "50-250",
            flipsideLowCost: base,
            flipsideTargetCost: Math.round(base * 1.28),
            flipsideHighCost: Math.round(base * 1.62),
            laborAssumptions: `Flipside planning labor range for ${category.toLowerCase()} item ${i}. Update with completed project history.`,
            materialAssumptions: "Material allowance is an editable planning value and should be tightened with selections or vendor quote.",
            laborRange: "Standard crew planning range",
            materialRange: "Good / better allowance",
            markup: 18,
            riskFactor: i === 3 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
            complexityLevel: i === 1 ? "Standard" : i === 2 ? "Moderate" : "Complex",
            permitTrigger: ["Electrical", "Plumbing", "Roofing", "Framing"].includes(category) ? "Review permit need" : "Usually scope-dependent",
            licensedTradeRequired: ["Electrical", "Plumbing", "Roofing"].includes(category),
            austinNotes: "Austin-area planning note. Replace with current vendor/trade history as completed projects build the cost database.",
            referenceUrl: "",
            vendorQuoteNotes: "Request vendor quote when selections or concealed conditions affect price.",
            projectHistoryNotes: "Seed item; update after completed Flipside projects.",
            internalPricingNotes: "Do not treat as final client pricing without scope review."
          }
        })
      );
    }
  }

  const serviceTemplateSeeds = [
    ["Demolition", "Remove kitchen cabinets", "DEM-KITCHEN-CAB-REMOVE", "linear ft"],
    ["Demolition", "Remove bathroom tile", "DEM-BATH-TILE-REMOVE", "sq ft"],
    ["Electrical", "Rough electrical update", "ELEC-ROUGH-UPDATE", "opening"],
    ["Finish Electrical", "Install finish electrical devices", "ELEC-FINISH-DEVICES", "each"],
    ["Rough Plumbing", "Rough plumbing adjustment", "PLUMB-ROUGH-ADJUST", "fixture"],
    ["Finish Plumbing", "Install bath fixtures", "PLUMB-FINISH-BATH", "fixture"],
    ["Flooring", "Install LVP flooring", "FLOOR-LVP-INSTALL", "sq ft"],
    ["Stone & Tile", "Install shower wall tile", "TILE-SHOWER-WALL", "sq ft"],
    ["Drywall & Plastering", "Repair drywall surfaces", "DRYWALL-REPAIR", "sq ft"],
    ["Painting", "Interior repaint", "PAINT-INTERIOR", "sq ft"],
    ["Trim Carpentry", "Install interior trim", "TRIM-INTERIOR-INSTALL", "linear ft"],
    ["Countertops", "Coordinate countertop install", "COUNTER-INSTALL", "sq ft"],
    ["Cabinets", "Install stock cabinets", "CAB-STOCK-INSTALL", "linear ft"],
    ["Framing", "Frame interior wall opening", "FRAME-WALL-OPENING", "opening"],
    ["Roofing & Gutters", "Repair roof flashing", "ROOF-FLASHING-REPAIR", "area"],
    ["Exterior Painting", "Exterior paint touch-up", "PAINT-EXTERIOR-TOUCHUP", "area"],
    ["Site Work", "Prepare jobsite protection", "SITE-PROTECTION", "job"],
    ["Appliances", "Install kitchen appliance", "APP-KITCHEN-INSTALL", "each"],
    ["Glazing & Mirrors", "Install bathroom mirror", "GLAZE-MIRROR-INSTALL", "each"],
    ["Management", "Project closeout package", "MGMT-CLOSEOUT", "job"]
  ] as const;

  for (const [category, serviceName, templateCode, unitType] of serviceTemplateSeeds) {
    const existingTemplate = await prisma.serviceTemplate.findUnique({ where: { templateCode } });
    if (!existingTemplate) {
      const catalogMatch = catalogItems.find((item) => item.category === category || item.category.includes(category.split(" ")[0]));
      await prisma.serviceTemplate.create({
        data: {
          organizationId: org.id,
          costCatalogItemId: catalogMatch?.id,
          category,
          serviceName,
          templateCode,
          defaultUnitType: unitType,
          shortDescription: `Original Flipside service playbook for ${serviceName.toLowerCase()}.`,
          estimatorNotes: "Verify measurements, access, existing conditions, selections, trade requirements, and required proof before final pricing.",
          clientSummary: `Includes labor coordination and standard execution steps for ${serviceName.toLowerCase()} based on approved scope and site conditions.`,
          permitGuidance: ["Electrical", "Plumbing", "Framing", "Roofing"].some((word) => category.includes(word)) ? "Review permit and inspection requirements before scheduling." : "Permit need is usually scope and jurisdiction dependent.",
          riskGuidance: "Hidden conditions, access limits, material availability, and owner changes can affect final cost or schedule.",
          steps: {
            create: [
              {
                stepNumber: 1,
                stepName: "Confirm scope and conditions",
                instructions: "Verify location, measurements, access, protection needs, existing conditions, and any client decisions before work starts.",
                audience: "ESTIMATOR",
                required: true,
                blocksProgress: true
              },
              {
                stepNumber: 2,
                stepName: "Protect work area",
                instructions: "Protect adjacent finishes, isolate dust/debris when needed, stage tools/materials safely, and document pre-existing conditions.",
                audience: "FIELD_CREW",
                required: true,
                blocksProgress: true
              },
              {
                stepNumber: 3,
                stepName: "Execute approved work",
                instructions: "Perform the approved scope using trade-appropriate methods. Stop and report any field condition that changes cost, schedule, or scope.",
                audience: "FIELD_CREW",
                required: true,
                blocksProgress: false
              },
              {
                stepNumber: 4,
                stepName: "Quality check",
                instructions: "Check alignment, fit, finish, operation, cleanup, and scope completion before marking the item ready for review.",
                audience: "FIELD_CREW",
                required: true,
                blocksProgress: true
              },
              {
                stepNumber: 5,
                stepName: "Document completion",
                instructions: "Attach final photos, notes, and any client-visible update needed for reporting, billing, or closeout.",
                audience: "INTERNAL",
                required: true,
                blocksProgress: true
              }
            ]
          },
          quoteSections: {
            create: [
              {
                sectionType: "INCLUDED_SCOPE",
                title: "Included scope",
                body: `Provide labor and coordination for ${serviceName.toLowerCase()} in the approved work area. Includes ordinary setup, execution, quality check, and cleanup directly related to this scope.`,
                sortOrder: 1,
                clientVisible: true
              },
              {
                sectionType: "EXCLUSIONS",
                title: "Exclusions",
                body: "Excludes hidden-condition repairs, unapproved scope changes, premium material upgrades, after-hours work, and additional trade work not listed in the approved estimate.",
                sortOrder: 2,
                clientVisible: true
              },
              {
                sectionType: "ASSUMPTIONS",
                title: "Assumptions",
                body: "Pricing assumes reasonable access, normal working conditions, available selections/materials, and no concealed damage beyond noted scope.",
                sortOrder: 3,
                clientVisible: true
              },
              {
                sectionType: "RISK_NOTES",
                title: "Risk notes",
                body: "If field conditions differ from visible conditions at estimate time, Flipside will document the issue and request approval before changed work proceeds.",
                sortOrder: 4,
                clientVisible: true
              }
            ]
          },
          taskTemplates: {
            create: [
              { taskName: `Measure and confirm ${serviceName}`, phaseName: "Scope Definition", defaultPriority: "HIGH", defaultDurationDays: 1, notes: "Confirm quantities and assumptions." },
              { taskName: `Prep area for ${serviceName}`, phaseName: "Demolition / Prep", defaultPriority: "MEDIUM", defaultDurationDays: 1, notes: "Protection and staging." },
              { taskName: `Complete ${serviceName}`, phaseName: "Finish Install", defaultPriority: "HIGH", defaultDurationDays: 2, notes: "Execute approved scope." },
              { taskName: `Photo and quality check ${serviceName}`, phaseName: "Punch List", defaultPriority: "HIGH", defaultDurationDays: 1, notes: "Attach proof and confirm finish quality." }
            ]
          },
          invoiceMilestones: {
            create: [
              { milestoneName: "Deposit / mobilization", percentOfScope: 35, triggerEvent: "Scope approved", clientDescription: "Initial payment to schedule work, procure materials, and mobilize project coordination." },
              { milestoneName: "Work substantially complete", percentOfScope: 50, triggerEvent: "Primary work complete", clientDescription: "Progress payment tied to substantial completion of approved scope." },
              { milestoneName: "Final completion", percentOfScope: 15, triggerEvent: "Quality check and closeout", clientDescription: "Final balance after completion review and closeout documentation." }
            ]
          },
          evidenceRequirements: {
            create: [
              { evidenceType: "PHOTO", label: "Before photo", instructions: "Capture pre-existing condition before work starts.", requiredBefore: "Work start" },
              { evidenceType: "PHOTO", label: "Progress or hidden-work photo", instructions: "Capture proof before work is covered or before the next trade proceeds.", requiredBefore: "Phase completion" },
              { evidenceType: "PHOTO", label: "Completion photo", instructions: "Capture finished condition for client report and closeout.", requiredBefore: "Invoice milestone" },
              { evidenceType: "NOTE", label: "Scope variance note", instructions: "Document any field condition, selection issue, or client request that changes scope.", requiredBefore: "Change order review" }
            ]
          }
        }
      });
    }
  }

  await prisma.marketCostFactor.createMany({
    data: [
      { organizationId: org.id, marketName: "Austin Core", zipPrefix: "787", laborMultiplier: 1.08, materialMultiplier: 1.04, permitMultiplier: 1.12, notes: "Seeded central Austin cost factor." },
      { organizationId: org.id, marketName: "Round Rock / Pflugerville", zipPrefix: "786", laborMultiplier: 1.0, materialMultiplier: 1.0, permitMultiplier: 1.0, notes: "Seeded suburban market baseline." }
    ],
    skipDuplicates: true
  });

  await prisma.laborRate.createMany({
    data: [
      { organizationId: org.id, tradeName: "Carpentry", crewType: "Lead + helper", hourlyRate: 82, burdenPercent: 18 },
      { organizationId: org.id, tradeName: "Tile", crewType: "Specialty installer", hourlyRate: 96, burdenPercent: 20 },
      { organizationId: org.id, tradeName: "Painting", crewType: "Two-person crew", hourlyRate: 68, burdenPercent: 16 },
      { organizationId: org.id, tradeName: "Electrical", crewType: "Licensed trade", hourlyRate: 118, burdenPercent: 22 },
      { organizationId: org.id, tradeName: "Plumbing", crewType: "Licensed trade", hourlyRate: 124, burdenPercent: 22 }
    ]
  });

  await prisma.materialAllowance.createMany({
    data: [
      { organizationId: org.id, category: "Tile", allowanceName: "Better wall tile allowance", qualityTier: "Better", unitType: "sq ft", unitCost: 8.5, notes: "Editable allowance for client selections." },
      { organizationId: org.id, category: "Flooring", allowanceName: "LVP allowance", qualityTier: "Good", unitType: "sq ft", unitCost: 5.25, notes: "Material-only planning allowance." },
      { organizationId: org.id, category: "Fixtures", allowanceName: "Bath fixture allowance", qualityTier: "Better", unitType: "each", unitCost: 650, notes: "Update once selections are known." },
      { organizationId: org.id, category: "Countertops", allowanceName: "Quartz allowance", qualityTier: "Better", unitType: "sq ft", unitCost: 78, notes: "Fabrication and install vary by slab and edge." }
    ]
  });

  const leadSeeds = [
    { leadName: "Hartmann kitchen + bath", status: "QUOTE_SENT", followUpDate: new Date(Date.now() + 3 * 86400000), estimatedBudget: 87000, notes: "Referred by Diego Vega. Scope includes full kitchen gut and primary bath. Client has selections in progress." },
    { leadName: "Okafor full interior refresh", status: "DISCOVERY_SCHEDULED", followUpDate: new Date(Date.now() + 1 * 86400000), estimatedBudget: 62000, notes: "Warm referral from Carol Park. Open concept kitchen and two baths. Discovery call booked." },
    { leadName: "Park listing prep", status: "FOLLOW_UP_NEEDED", followUpDate: new Date(Date.now() - 1 * 86400000), estimatedBudget: 38000, notes: "Past client listing prep. Kitchen paint, flooring refresh, and exterior touch-up. Time sensitive." },
    { leadName: "Chen master bath", status: "WALKTHROUGH_SCHEDULED", followUpDate: new Date(Date.now() + 2 * 86400000), estimatedBudget: 44000, notes: "Owner-occupied full master bath gut. Walkthrough scheduled. Design selections needed." },
    { leadName: "King duplex turn - Cedar Ridge", status: "QUOTE_IN_PROGRESS", followUpDate: new Date(Date.now() + 4 * 86400000), estimatedBudget: 118000, notes: "Andre King investor project. Both units at Cedar Ridge. Flooring, kitchen, baths, and paint." },
    { leadName: "Morales pre-list kitchen", status: "NEW_LEAD", followUpDate: new Date(Date.now() + 5 * 86400000), estimatedBudget: 52000, notes: "Agent referral from Diego Vega. Kitchen update before listing. Budget range TBD." },
    { leadName: "Vance investment property", status: "NURTURE", followUpDate: new Date(Date.now() + 10 * 86400000), estimatedBudget: 71000, notes: "Investor hold - not ready to start. Check back in Q3 for full interior turn." },
    { leadName: "Brewster master bath expansion", status: "CONTACTED", followUpDate: new Date(Date.now() + 3 * 86400000), estimatedBudget: 58000, notes: "Homeowner wants to expand master bath into adjacent closet. Initial contact made, awaiting callback." }
  ] as const;
  const leads = [];
  for (let i = 0; i < 8; i++) {
    const seed = leadSeeds[i];
    leads.push(
      await prisma.lead.create({
        data: {
          organizationId: org.id,
          leadName: seed.leadName,
          leadType: i % 2 === 0 ? "Investor" : "Owner occupied",
          source: i % 2 === 0 ? "Agent referral" : "Website",
          relatedProfileId: profiles[i].id,
          relatedPropertyId: properties[i % properties.length].id,
          estimatedBudget: seed.estimatedBudget,
          urgency: 45 + i * 5,
          jobFitScore: 58 + i * 4,
          trustFitScore: 52 + i * 4,
          scopeClarity: 45 + i * 5,
          financingNeed: i % 3 === 0,
          probability: 40 + i * 6,
          nextAction: "Schedule discovery and clarify target scope.",
          followUpDate: seed.followUpDate,
          status: seed.status as never,
          notes: seed.notes
        }
      })
    );
  }

  // Quote clients: Nina Okafor (homeowner), Andre King (investor), Sarah Hartmann (approved/job)
  const quoteClientProfiles = [profiles[2], profiles[8], profiles[0]];
  const quoteNames = ["Okafor - Full Interior Kitchen + Bath Remodel", "King - Cedar Ridge Unit A Investor Turn", "Hartmann Ave - Kitchen and Primary Bath"];
  const quoteLeads = [leads[2], leads[4], leads[0]];
  const quotes = [];
  for (let i = 0; i < 3; i++) {
    const quote = await prisma.quote.create({
      data: {
        organizationId: org.id,
        quoteName: quoteNames[i],
        clientProfileId: quoteClientProfiles[i].id,
        propertyId: properties[i].id,
        leadId: quoteLeads[i].id,
        quoteStatus: i === 2 ? "APPROVED" : "PRICING",
        projectType: "Kitchen, bath, paint, flooring",
        budgetRange: "$75k-$150k",
        permitLikely: i === 2,
        tradesNeeded: ["Demo", "Electrical", "Plumbing", "Paint"],
        riskLevel: i === 2 ? "HIGH" : "MEDIUM",
        gcMarkup: 18,
        contingency: 8,
        notes: "Priced from Flipside cost catalog. Verify tile and fixture allowances before sending."
      }
    });

    const itemTotals = [];
    for (let line = 0; line < 4; line++) {
      const catalog = catalogItems[i * 4 + line];
      const quantity = line + 1;
      const low = Number(catalog.flipsideLowCost);
      const target = Number(catalog.flipsideTargetCost);
      const high = Number(catalog.flipsideHighCost);
      const calc = calculateLineItem({
        quantity,
        laborLow: low * 0.55,
        laborTarget: target * 0.55,
        laborHigh: high * 0.55,
        materialLow: low * 0.45,
        materialTarget: target * 0.45,
        materialHigh: high * 0.45,
        subcontractorCost: 0,
        markupPercent: Number(catalog.markup),
        riskFactor: catalog.riskFactor
      });
      itemTotals.push(calc);
      await prisma.quoteLineItem.create({
        data: {
          quoteId: quote.id,
          costCatalogItemId: catalog.id,
          scopeArea: catalog.category,
          lineItemName: catalog.serviceName,
          unitType: catalog.unitType,
          quantity,
          laborLow: low * 0.55,
          laborTarget: target * 0.55,
          laborHigh: high * 0.55,
          materialLow: low * 0.45,
          materialTarget: target * 0.45,
          materialHigh: high * 0.45,
          markupPercent: catalog.markup,
          riskFactor: catalog.riskFactor,
          totalLow: calc.totalLow,
          totalTarget: calc.totalTarget,
          totalHigh: calc.totalHigh,
          clientFacingDescription: "Scope line priced from Flipside cost catalog. Allowances subject to final selections.",
          sortOrder: line
        }
      });
    }
    const totals = calculateQuoteTotals(itemTotals, 18, 8);
    quotes.push(
      await prisma.quote.update({
        where: { id: quote.id },
        data: { totalLow: totals.totalLow, totalTarget: totals.totalTarget, totalHigh: totals.totalHigh, finalQuoteAmount: totals.finalQuoteAmount }
      })
    );
  }

  for (let i = 0; i < 2; i++) {
    const quote = quotes[i];
    const estimateNumber = `EST-${1001 + i}`;
    const existingEstimate = await prisma.estimate.findUnique({ where: { estimateNumber } });
    let estimate = existingEstimate;
    if (!estimate) {
      estimate = await prisma.estimate.create({
        data: {
        quoteId: quote.id,
        estimateNumber,
        clientProfileId: quote.clientProfileId,
        propertyId: quote.propertyId,
        issueDate: new Date(),
        expirationDate: new Date(Date.now() + 21 * 86400000),
        subtotal: quote.totalTarget,
        markup: quote.gcMarkup,
        contingency: quote.contingency,
        tax: 0,
        total: quote.finalQuoteAmount ?? quote.totalTarget,
        status: i === 0 ? "SENT" : "DRAFT",
        sentAt: i === 0 ? new Date(Date.now() - 86400000) : null,
        viewedAt: i === 0 ? new Date() : null,
        confidenceLevel: i === 0 ? "MEDIUM" : "LOW",
        confidenceScore: i === 0 ? 68 : 48,
        readinessScore: i === 0 ? 74 : 52,
        scopeClarity: 65,
        pricingSource: "Flipside cost catalog · field measure + catalog",
        nextFollowUpDue: new Date(Date.now() + (i + 1) * 86400000),
        clientFacingSummary: "Scope is priced from catalog assumptions and should be reviewed against site conditions, selections, and trade quotes.",
        internalRiskNotes: "Verify concealed conditions and allowance selections before acceptance.",
        revisions: {
          create: {
            revisionNumber: 1,
            reason: "Seed initial estimate.",
            subtotal: quote.totalTarget,
            total: quote.finalQuoteAmount ?? quote.totalTarget,
            snapshot: { source: "seed" }
          }
        },
        viewEvents: i === 0 ? { create: { ipHash: "seeded", userAgent: "Seed browser event" } } : undefined,
        followUps: {
          create: [
            {
              relatedLeadId: quote.leadId,
              followUpType: "CONFIRM_RECEIVED",
              status: i === 0 ? "DUE" : "SCHEDULED",
              dueDate: new Date(Date.now() + 86400000),
              suggestedMessage: "Just confirming you received the estimate. What questions can I answer about scope, allowances, or timing?"
            },
            {
              relatedLeadId: quote.leadId,
              followUpType: "ANSWER_QUESTIONS",
              dueDate: new Date(Date.now() + 3 * 86400000),
              suggestedMessage: "Are there any scope items you want clarified or separated as alternates?"
            },
            {
              relatedLeadId: quote.leadId,
              followUpType: "DECISION_TIMELINE",
              dueDate: new Date(Date.now() + 7 * 86400000),
              suggestedMessage: "Do you have a target decision timeline so we can plan scheduling and trade availability?"
            }
          ]
        }
        }
      });
    }
    if (estimate) {
      const existingOptions = await prisma.estimateOption.count({ where: { estimateId: estimate.id } });
      if (existingOptions === 0) {
        await prisma.estimateOption.createMany({
          data: [
            { estimateId: estimate.id, optionName: "Rental-ready scope", optionTier: "Good", description: "Durable baseline finishes and focused ROI scope.", total: Number(quote.finalQuoteAmount ?? quote.totalTarget) * 0.92, included: i === 0, sortOrder: 1 },
            { estimateId: estimate.id, optionName: "Owner-preferred finish package", optionTier: "Better", description: "Balanced finish upgrades with stronger client-facing presentation.", total: Number(quote.finalQuoteAmount ?? quote.totalTarget), included: i !== 0, sortOrder: 2 },
            { estimateId: estimate.id, optionName: "Listing standout package", optionTier: "Best", description: "Premium selections and added details for resale or luxury positioning.", total: Number(quote.finalQuoteAmount ?? quote.totalTarget) * 1.18, included: false, sortOrder: 3 }
          ]
        });
      }
      const existingApproval = await prisma.clientApproval.findFirst({ where: { estimateId: estimate.id, approvalType: "Estimate approval" } });
      if (!existingApproval) {
        await prisma.clientApproval.create({
          data: {
            estimateId: estimate.id,
            approvalType: "Estimate approval",
            status: i === 0 ? "SENT" : "DRAFT",
            sentAt: i === 0 ? new Date() : null,
            signerName: quote.clientProfileId ? profiles[i].profileName : null,
            signerEmail: quote.clientProfileId ? profiles[i].email : null,
            notes: "Sample approval record for one-click client acceptance tracking."
          }
        });
      }
    }
    await prisma.quote.update({ where: { id: quote.id }, data: { quoteStatus: i === 0 ? "SENT" : "PRICING" } });
  }

  const kitchenAssembly = await prisma.costAssembly.create({
    data: {
      organizationId: org.id,
      assemblyName: "Investor kitchen refresh",
      projectType: "Kitchen",
      description: "Repeatable kitchen refresh assembly for value-add investor properties.",
      defaultScopeNotes: "Demo, cabinets allowance, countertop allowance, appliance install, paint, trim, and fixture coordination.",
      market: "Austin, TX",
      complexityLevel: "Moderate",
      confidenceLevel: "MEDIUM",
      items: {
        create: catalogItems.slice(0, 8).map((item, index) => ({
          costCatalogItemId: item.id,
          scopeArea: item.category,
          defaultQuantity: index + 1,
          required: index < 6,
          notes: "Seed assembly item. Adjust quantity by site measure."
        }))
      }
    }
  });

  await prisma.costAssembly.create({
    data: {
      organizationId: org.id,
      assemblyName: "Rental bath turn",
      projectType: "Bathroom",
      description: "Bathroom turnover assembly for rental and value-add properties.",
      defaultScopeNotes: "Demo, tile, plumbing trim, paint, drywall repair, fixture install.",
      market: "Austin, TX",
      complexityLevel: "Standard",
      confidenceLevel: "HIGH",
      items: {
        create: catalogItems.slice(18, 26).map((item, index) => ({
          costCatalogItemId: item.id,
          scopeArea: item.category,
          defaultQuantity: index + 2,
          required: true,
          notes: "Seed bath assembly item."
        }))
      }
    }
  });

  const job = await prisma.job.create({
    data: {
      organizationId: org.id,
      jobName: "Hartmann Ave - Kitchen + Bath Renovation",
      clientProfileId: profiles[0].id,   // Sarah Hartmann
      propertyId: properties[3].id,
      approvedQuoteId: quotes[2].id,
      jobStatus: "ROUGH_IN",
      startDate: new Date(Date.now() - 42 * 86400000),
      targetCompletion: new Date(Date.now() + 21 * 86400000),
      contractAmount: 112400,
      amountPaid: 44900,
      balanceDue: 67500,
      activePhase: renovationPhases[5],
      weeklyReportDue: new Date(Date.now() + 2 * 86400000),
      permitStatus: "Building permit issued · inspection pending",
      riskLevel: "MEDIUM",
      notes: "Active renovation. Kitchen demo complete, rough trades in progress. Weekly reports current.",
      phases: {
        create: renovationPhaseDetails.map(([phaseName, description], index) => ({
          phaseNumber: index + 1,
          phaseName,
          status: index < 3 ? "COMPLETE" : index === 3 ? "IN_PROGRESS" : "NOT_STARTED",
          clientUpdate: description,
          completionCriteria: "Photos, scope confirmation, risk review, and client-ready update are complete."
        }))
      }
    },
    include: { phases: true }
  });

  const taskSeeds = [
    { taskName: "Confirm tile selection with client", dueDate: new Date(Date.now() - 35 * 86400000), status: "COMPLETE", priority: "MEDIUM" },
    { taskName: "Schedule rough electrical inspection", dueDate: new Date(Date.now() - 21 * 86400000), status: "COMPLETE", priority: "MEDIUM" },
    { taskName: "Order countertop material", dueDate: new Date(Date.now() + 7 * 86400000), status: "IN_PROGRESS", priority: "HIGH" },
    { taskName: "Coordinate plumbing trim-out date", dueDate: new Date(Date.now() + 10 * 86400000), status: "IN_PROGRESS", priority: "HIGH" },
    { taskName: "Send weekly client report", dueDate: new Date(Date.now() + 1 * 86400000), status: "IN_PROGRESS", priority: "HIGH" }
  ] as const;
  for (let i = 0; i < 5; i++) {
    const t = taskSeeds[i];
    await prisma.task.create({
      data: {
        taskName: t.taskName,
        jobId: job.id,
        phaseId: job.phases[i].id,
        assignedToProfileId: profiles[6].id,
        dueDate: t.dueDate,
        status: t.status,
        priority: t.priority,
        notes: "Active job task."
      }
    });
  }

  const templateLibrary = [
    {
      templateName: "Estimate readiness checklist",
      entityType: "ESTIMATE",
      category: "Preconstruction",
      blocksProgress: true,
      items: [
        ["Scope areas are defined", "BLOCK_PHASE", null],
        ["Allowances are visible to client", "CLIENT_DECISION", null],
        ["Exclusions are documented", "NONE", null],
        ["Risk notes reviewed internally", "NONE", null],
        ["Client-facing summary is plainspoken", "NONE", null]
      ]
    },
    {
      templateName: "Hidden work photo checklist",
      entityType: "PHASE",
      category: "Field proof",
      blocksProgress: true,
      items: [
        ["Wide photo before cover-up", "REQUIRE_PHOTO", "PHOTO"],
        ["Close-up of waterproofing or rough-in", "REQUIRE_PHOTO", "PHOTO"],
        ["Reference point photo", "REQUIRE_PHOTO", "PHOTO"],
        ["Inspector/client note saved", "NONE", "NOTE"]
      ]
    },
    {
      templateName: "Change order protection checklist",
      entityType: "CHANGE_ORDER",
      category: "Profit protection",
      blocksProgress: true,
      items: [
        ["Reason is documented", "NONE", null],
        ["Cost impact is entered", "BLOCK_INVOICE", null],
        ["Time impact is entered", "CLIENT_DECISION", null],
        ["Photos attached when field condition", "REQUIRE_PHOTO", "PHOTO"],
        ["Client approval required before work", "REQUIRE_SIGNATURE", "SIGNATURE"]
      ]
    },
    {
      templateName: "Daily field closeout checklist",
      entityType: "FIELD_REPORT",
      category: "Field ops",
      blocksProgress: false,
      items: [
        ["Completed work logged", "NONE", null],
        ["Blockers reported", "CREATE_TASK", null],
        ["Materials needed noted", "CREATE_TASK", null],
        ["Hours submitted", "NONE", null],
        ["Progress photos uploaded", "REQUIRE_PHOTO", "PHOTO"]
      ]
    },
    {
      templateName: "Final closeout packet checklist",
      entityType: "CLOSEOUT",
      category: "Closeout",
      blocksProgress: true,
      items: [
        ["Final photos attached", "REQUIRE_PHOTO", "PHOTO"],
        ["Warranty notes prepared", "NONE", null],
        ["Final invoice sent", "BLOCK_INVOICE", null],
        ["Client testimonial requested", "NONE", null],
        ["Subcontractor scorecard complete", "NONE", null]
      ]
    }
  ] as const;

  for (const template of templateLibrary) {
    const existing = await prisma.checklistTemplate.findFirst({ where: { organizationId: org.id, templateName: template.templateName } });
    if (!existing) {
      const created = await prisma.checklistTemplate.create({
        data: {
          organizationId: org.id,
          templateName: template.templateName,
          entityType: template.entityType,
          category: template.category,
          blocksProgress: template.blocksProgress,
          description: "Sample renovation workflow checklist template.",
          items: {
            create: template.items.map(([itemText, actionOnFail, evidenceType], index) => ({
              itemText,
              sortOrder: index + 1,
              required: true,
              actionOnFail,
              evidenceType
            }))
          }
        },
        include: { items: true }
      });
      if (template.templateName === "Hidden work photo checklist") {
        await prisma.checklistRun.create({
          data: {
            templateId: created.id,
            entityType: "PHASE",
            entityId: job.phases[7]?.id ?? job.id,
            title: "Mesa Ridge hidden work proof",
            status: "Open",
            items: {
              create: created.items.map((item) => ({
                templateItemId: item.id,
                itemText: item.itemText,
                evidenceRequired: Boolean(item.evidenceType),
                evidence: item.evidenceType
                  ? {
                      create: {
                        entityType: "PHASE",
                        entityId: job.phases[7]?.id ?? job.id,
                        evidenceType: item.evidenceType,
                        label: item.itemText,
                        instructions: "Capture before surfaces are closed."
                      }
                    }
                  : undefined
              }))
            }
          }
        });
      }
    }
  }

  await prisma.fieldAssignment.createMany({
    data: [
      { profileId: profiles[6].id, jobId: job.id, assignmentDate: new Date(), status: "Scheduled", instructions: "Backer board install in primary bath. Upload waterproofing photos before leaving. Report any substrate issues." },
      { profileId: profiles[4].id, jobId: job.id, assignmentDate: new Date(Date.now() + 86400000), status: "Scheduled", instructions: "Review tile layout with client. Confirm countertop edge profile and sink cutout dimensions." }
    ],
    skipDuplicates: true
  });

  await prisma.teamCircle.create({
    data: {
      organizationId: org.id,
      circleName: "Core Field Crew",
      purpose: "Default assignment circle for active renovation production work.",
      defaultRole: "Field production",
      members: {
        create: [
          { profileId: profiles[6].id, role: "Tile subcontractor", skillTags: ["tile", "bath", "waterproofing"], availability: "Available next week" },
          { profileId: profiles[4].id, role: "Design support", skillTags: ["selections", "client decisions"], availability: "Remote" }
        ]
      }
    }
  });

  await prisma.budgetLine.createMany({
    data: [
      { jobId: job.id, lineType: "LABOR", category: "Demo", description: "Demo and site prep labor", estimatedAmount: 6200, committedAmount: 5800, actualAmount: 6100, forecastAmount: 6300, varianceAmount: -100 },
      { jobId: job.id, lineType: "MATERIAL", category: "Tile", description: "Tile allowance - bath and kitchen backsplash", estimatedAmount: 7600, committedAmount: 8200, actualAmount: 0, forecastAmount: 8200, varianceAmount: 600 },
      { jobId: job.id, lineType: "SUBCONTRACTOR", category: "Electrical", description: "Electrical rough-in and trim", estimatedAmount: 9800, committedAmount: 9800, actualAmount: 0, forecastAmount: 9800, varianceAmount: 0 },
      { jobId: job.id, lineType: "CONTINGENCY", category: "Unknowns", description: "Field condition reserve", estimatedAmount: 9000, committedAmount: 0, actualAmount: 0, forecastAmount: 7500, varianceAmount: -1500 }
    ]
  });

  await prisma.reimbursement.create({
    data: {
      jobId: job.id,
      profileId: profiles[6].id,
      description: "Emergency waterproofing membrane - additional roll needed on site",
      amount: 186.42,
      status: "Submitted",
      notes: "Receipt pending upload."
    }
  });

  await prisma.meeting.createMany({
    data: [
      { jobId: job.id, title: "Client selections walkthrough - tile and countertops", meetingType: "Client", scheduledAt: new Date(Date.now() + 1 * 86400000), attendees: ["Client", "Designer", "PM"], agenda: "Confirm tile, fixtures, countertop edge.", decisions: "Pending tile selection." },
      { jobId: job.id, title: "Electrical and plumbing coordination call", meetingType: "Internal", scheduledAt: new Date(Date.now() + 2 * 86400000), attendees: ["PM", "Electrical", "Plumbing"], agenda: "Coordinate rough-in sequence and inspection readiness." }
    ]
  });

  // Renovation photo URLs (Unsplash stable CDN — renovation & construction)
  const PHOTOS = {
    kitchenBefore: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&q=80&auto=format&fit=crop",
    bathBefore:    "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?w=900&q=80&auto=format&fit=crop",
    framing:       "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&q=80&auto=format&fit=crop",
    roughIn:       "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=80&auto=format&fit=crop",
    drywall:       "https://images.unsplash.com/photo-1544986581-efac5e8c3975?w=900&q=80&auto=format&fit=crop",
    tileWork:      "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&q=80&auto=format&fit=crop",
    kitchenAfter:  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80&auto=format&fit=crop",
    kitchenAfter2: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=80&auto=format&fit=crop",
    bathAfter:     "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&q=80&auto=format&fit=crop",
    flooring:      "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=900&q=80&auto=format&fit=crop",
    exterior:      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=80&auto=format&fit=crop",
    cabinetry:     "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=900&q=80&auto=format&fit=crop",
  };

  // Job gallery photos — BEFORE / DURING / AFTER
  await prisma.jobPhoto.createMany({
    data: [
      { jobId: job.id, url: PHOTOS.kitchenBefore, label: "BEFORE", phase: "Pre-Construction", roomArea: "Kitchen", caption: "Original kitchen — dated cabinets, damaged countertop, no island. Full gut scope approved.", takenAt: new Date(Date.now() - 43 * 86400000) },
      { jobId: job.id, url: PHOTOS.bathBefore, label: "BEFORE", phase: "Pre-Construction", roomArea: "Primary Bath", caption: "Primary bath before demo — original vanity, cultured marble, failing shower pan.", takenAt: new Date(Date.now() - 43 * 86400000) },
      { jobId: job.id, url: PHOTOS.framing, label: "DURING", phase: "Framing", roomArea: "Kitchen", caption: "Kitchen island framing in progress. New structural opening per approved plans.", takenAt: new Date(Date.now() - 32 * 86400000) },
      { jobId: job.id, url: PHOTOS.roughIn, label: "DURING", phase: "Rough-In", roomArea: "Kitchen", caption: "Electrical rough-in for island and under-cabinet lighting. Inspector sign-off pending.", takenAt: new Date(Date.now() - 21 * 86400000) },
      { jobId: job.id, url: PHOTOS.drywall, label: "DURING", phase: "Drywall & Surfaces", roomArea: "Primary Bath", caption: "Cement backer board installed. Waterproofing membrane applied and cured — ready for tile.", takenAt: new Date(Date.now() - 14 * 86400000) },
      { jobId: job.id, url: PHOTOS.tileWork, label: "DURING", phase: "Finishes", roomArea: "Primary Bath", caption: "Shower wall tile layout — 12×24 large format. Lippage within spec. Grout next.", takenAt: new Date(Date.now() - 7 * 86400000) },
      { jobId: job.id, url: PHOTOS.kitchenAfter, label: "AFTER", phase: "Final Walkthrough", roomArea: "Kitchen", caption: "Kitchen complete — white shaker cabinets, quartz countertop, new island. Client approved.", takenAt: new Date(Date.now() - 1 * 86400000) },
      { jobId: job.id, url: PHOTOS.bathAfter, label: "AFTER", phase: "Final Walkthrough", roomArea: "Primary Bath", caption: "Primary bath complete — large format tile, matte black fixtures, frameless glass shower.", takenAt: new Date(Date.now() - 1 * 86400000) },
      { jobId: job.id, url: PHOTOS.flooring, label: "AFTER", phase: "Final Walkthrough", roomArea: "Main Floor", caption: "Hardwood refinish complete — living room and hallway. Three coats satin polyurethane.", takenAt: new Date(Date.now() - 1 * 86400000) },
    ]
  });

  await prisma.fieldReport.create({
    data: {
      jobId: job.id,
      reportDate: new Date(Date.now() - 3 * 86400000),
      crewSummary: "Marcus Webb + Ben Whitaker (tile sub). Electrical rough-in complete and signed off.",
      workCompleted: "Electrical rough-in inspection passed. Set 48 sheets backer board in primary bath. Applied waterproofing membrane — first coat complete. Confirmed tile layout with Whitaker.",
      blockers: "Countertop template measurement waiting on final cabinet install. ETA Thursday. Countertop lead time 10 business days after template.",
      materialsUsed: "Backer board 48 sheets, thin-set 4 bags, Schluter Kerdi waterproofing membrane.",
      equipmentUsed: "Shop vac, Bosch laser level, demo hand tools, mixing drill.",
      weatherNotes: "Clear — no weather impact on occupied renovation.",
      photos: [PHOTOS.drywall, PHOTOS.roughIn, PHOTOS.tileWork],
      clientVisible: true
    }
  });

  await prisma.timeEntry.createMany({
    data: [
      { jobId: job.id, profileId: profiles[6].id, workDate: new Date(Date.now() - 3 * 86400000), hours: 7.5, laborType: "Tile prep and backer board", status: "Submitted", notes: "Backer board install and waterproofing review." },
      { jobId: job.id, profileId: profiles[4].id, workDate: new Date(Date.now() - 3 * 86400000), hours: 2, laborType: "Selections coordination", status: "Approved", notes: "Client finish coordination and countertop edge review." }
    ]
  });

  const material = await prisma.materialItem.create({
    data: {
      organizationId: org.id,
      itemName: "Waterproofing membrane",
      category: "Tile",
      unitType: "roll",
      quantityOnHand: 4,
      reorderPoint: 2,
      preferredVendor: "Local tile supply",
      barcode: "FS-MAT-0001",
      notes: "Barcode-ready seed item."
    }
  });
  await prisma.materialRequest.create({
    data: {
      jobId: job.id,
      materialItemId: material.id,
      itemName: material.itemName,
      quantity: 2,
      neededBy: new Date(Date.now() + 4 * 86400000),
      status: "Requested",
      deliveryNotes: "Deliver before bath waterproofing inspection."
    }
  });

  const equipment = await prisma.equipmentAsset.create({
    data: {
      organizationId: org.id,
      assetName: "Dump trailer",
      assetType: "Trailer",
      status: "ASSIGNED",
      barcode: "FS-EQ-0001",
      maintenanceDue: new Date(Date.now() + 45 * 86400000),
      assignments: { create: { jobId: job.id, assignedFrom: new Date(), assignedUntil: new Date(Date.now() + 7 * 86400000), notes: "Demo debris window." } }
    }
  });
  const tool = await prisma.toolAsset.create({
    data: {
      organizationId: org.id,
      toolName: "Laser level kit",
      category: "Layout",
      status: "ASSIGNED",
      barcode: "FS-TOOL-0001",
      lastSeenAt: new Date(),
      assignments: { create: { jobId: job.id, notes: "Assigned for layout and tile prep." } }
    }
  });

  const safetyTemplate = await prisma.safetyAuditTemplate.create({
    data: {
      templateName: "Occupied renovation safety check",
      category: "Jobsite safety",
      checklist: {
        items: ["Dust control in place", "Walk paths protected", "Tools secured", "Electrical hazards marked", "Client access separated"]
      }
    }
  });
  await prisma.permitRecord.create({
    data: {
      jobId: job.id,
      permitName: "Building and mechanical permit - kitchen renovation",
      jurisdiction: "Austin",
      status: "SUBMITTED",
      submittedAt: new Date(Date.now() - 14 * 86400000),
      inspectionDate: new Date(Date.now() + 4 * 86400000),
      notes: "Confirm inspection window after rough-in is complete."
    }
  });
  await prisma.safetyAudit.create({
    data: {
      jobId: job.id,
      templateId: safetyTemplate.id,
      score: 92,
      findings: "Improve extension cord routing near material staging.",
      correctiveActions: "Crew lead to reroute and tape down before next work block.",
      completedBy: "Project Manager"
    }
  });
  await prisma.incidentReport.create({
    data: {
      jobId: job.id,
      title: "Loose material bundle near stairwell",
      incidentDate: new Date(Date.now() - 5 * 86400000),
      severity: "LOW",
      description: "Tile backer board leaning against stairwell railing. No injury. Crew repositioned immediately.",
      correctiveAction: "Material moved and walkway marked.",
      reportedBy: "Field crew",
      resolvedAt: new Date(Date.now() - 5 * 86400000)
    }
  });

  await prisma.projectTemplate.create({
    data: {
      organizationId: org.id,
      templateName: "Kitchen refresh fast path",
      projectType: "Kitchen",
      description: "Deployable project template for investor kitchen refreshes.",
      rollbackPlan: "If selections or trade availability block the fast path, roll back to phase-gated material approval before demo.",
      steps: {
        create: [
          { stepNumber: 1, stepName: "Confirm scope and selections", defaultDurationDays: 2, checklist: { items: ["Cabinet plan", "Countertop allowance", "Appliance list"] }, rollbackNotes: "Pause estimate acceptance if selections are missing." },
          { stepNumber: 2, stepName: "Demo and field verify", defaultDurationDays: 2, checklist: { items: ["Photos", "Subfloor review", "MEP access"] }, rollbackNotes: "Create change order if concealed conditions are found." },
          { stepNumber: 3, stepName: "Install and closeout", defaultDurationDays: 8, checklist: { items: ["Cabinets", "Counters", "Trim", "Punch"] }, rollbackNotes: "Use punch-list fallback if materials arrive incomplete." }
        ]
      }
    }
  });

  await prisma.clientPortalUpdate.create({
    data: {
      jobId: job.id,
      title: "Selections and rough-in planning",
      summary: "This week focused on confirming selections and sequencing rough trades. The next decision is final tile selection.",
      requiresDecision: true,
      decisionPrompt: "Please confirm tile selection so waterproofing and install can stay on schedule."
    }
  });
  await prisma.feedbackRequest.create({
    data: {
      jobId: job.id,
      profileId: profiles[2].id,
      requestType: "Mid-project client pulse",
      status: "REQUESTED"
    }
  });
  await prisma.feedbackRequest.create({
    data: {
      profileId: profiles[6].id,
      requestType: "Subcontractor scorecard",
      status: "RECEIVED",
      rating: 5,
      feedback: "Reliable communication and clean work area."
    }
  });

  const existingSelectionSheet = await prisma.selectionSheet.findFirst({ where: { jobId: job.id, sheetName: "Primary bath and kitchen selections" } });
  if (!existingSelectionSheet) {
    const selectionEstimate = await prisma.estimate.findFirst({ where: { quoteId: quotes[2].id }, select: { id: true } });
    await prisma.selectionSheet.create({
      data: {
        jobId: job.id,
        estimateId: selectionEstimate?.id,
        clientProfileId: profiles[2].id,
        sheetName: "Primary bath and kitchen selections",
        roomArea: "Primary Bath / Kitchen",
        status: "CLIENT_REVIEWING",
        dueDate: new Date(Date.now() + 5 * 86400000),
        sentAt: new Date(),
        notes: "Client must approve tile, fixtures, and cabinet hardware before procurement.",
        items: {
          create: [
            {
              category: "Tile",
              roomArea: "Primary Bath",
              itemName: "Shower wall tile",
              allowanceAmount: 1800,
              targetBudget: 2200,
              selectedVendor: "Local tile supply",
              leadTimeDays: 10,
              requiredByDate: new Date(Date.now() + 4 * 86400000),
              decisionStatus: "CLIENT_REVIEWING",
              procurementStatus: "Not ordered",
              priceVariance: 400,
              scheduleImpactDays: 2,
              changeOrderNeeded: true,
              notes: "Selected option is above allowance and should generate a change order if approved.",
              options: {
                create: [
                  { optionName: "Matte white ceramic", tier: "GOOD", unitCost: 7.25, vendor: "Local tile supply", pros: "Durable and budget friendly.", cons: "Less visual impact." },
                  { optionName: "Textured porcelain", tier: "BETTER", unitCost: 10.5, vendor: "Local tile supply", pros: "Better finish and slip resistance.", cons: "Above allowance.", contractorRecommendation: true },
                  { optionName: "Handmade zellige look", tier: "BEST", unitCost: 16.75, vendor: "Special order", pros: "Premium look.", cons: "Longer lead time and more install variation." }
                ]
              }
            },
            {
              category: "Fixtures",
              roomArea: "Primary Bath",
              itemName: "Shower trim kit",
              allowanceAmount: 650,
              targetBudget: 650,
              selectedVendor: "Plumbing supplier",
              selectedSku: "FS-SEED-BLK-01",
              leadTimeDays: 7,
              requiredByDate: new Date(Date.now() + 6 * 86400000),
              decisionStatus: "APPROVED",
              procurementStatus: "Ready to order",
              priceVariance: 0,
              notes: "Approved black finish fixture set.",
              options: {
                create: [
                  { optionName: "Chrome trim kit", tier: "GOOD", unitCost: 520, vendor: "Plumbing supplier", pros: "Fast and cost effective.", cons: "Not desired finish." },
                  { optionName: "Matte black trim kit", tier: "BETTER", unitCost: 650, vendor: "Plumbing supplier", pros: "Matches client direction.", cons: "Confirm exact valve compatibility.", contractorRecommendation: true, clientApproved: true },
                  { optionName: "Premium thermostatic trim", tier: "BEST", unitCost: 980, vendor: "Plumbing supplier", pros: "Higher performance.", cons: "Over allowance." }
                ]
              },
              approvals: {
                create: {
                  approvalType: "Selection approval",
                  status: "APPROVED",
                  sentAt: new Date(Date.now() - 86400000),
                  viewedAt: new Date(Date.now() - 43200000),
                  approvedAt: new Date(),
                  signerName: profiles[2].profileName,
                  signerEmail: profiles[2].email,
                  notes: "Seed approved fixture selection."
                }
              }
            },
            {
              category: "Hardware",
              roomArea: "Kitchen",
              itemName: "Cabinet pulls",
              allowanceAmount: 320,
              targetBudget: 320,
              leadTimeDays: 5,
              requiredByDate: new Date(Date.now() + 8 * 86400000),
              decisionStatus: "OPTIONS_SENT",
              procurementStatus: "Not ordered",
              notes: "Waiting for client decision."
            }
          ]
        }
      }
    });
  }

  const aiAgents = await Promise.all([
    prisma.aiAgent.create({ data: { organizationId: org.id, agentName: "Scope Scout", roleName: "Estimator AI", purpose: "Find missing scope, allowance, and confidence issues before an estimate is sent.", guardrails: "Draft suggestions only. A human approves pricing and client-facing language." } }),
    prisma.aiAgent.create({ data: { organizationId: org.id, agentName: "Follow-Up Foreman", roleName: "Follow-Up AI", purpose: "Prepare estimate and lead follow-up reminders and suggested messages.", guardrails: "Never send client communications without approval." } }),
    prisma.aiAgent.create({ data: { organizationId: org.id, agentName: "Closeout Coach", roleName: "Review AI", purpose: "Prepare testimonial, review, and closeout packet prompts at the right time.", guardrails: "No manipulative review requests or fake testimonials." } })
  ]);
  await prisma.aiTask.createMany({
    data: [
      { organizationId: org.id, agentId: aiAgents[0].id, taskName: "Review Mesa Ridge estimate confidence", workflowArea: "Estimating", targetType: "ESTIMATE", targetId: quotes[0].id, status: "NEEDS_REVIEW", prompt: "Check estimate for missing allowances, exclusions, and risk language.", resultSummary: "Flag tile allowance and fixture selection before sending.", dueDate: new Date() },
      { organizationId: org.id, agentId: aiAgents[1].id, taskName: "Prepare follow-up for sent estimate", workflowArea: "Lead follow-up", targetType: "LEAD", targetId: leads[0].id, status: "QUEUED", prompt: "Draft a concise follow-up asking whether the client received the estimate and has scope questions.", dueDate: new Date(Date.now() + 86400000) },
      { organizationId: org.id, agentId: aiAgents[2].id, taskName: "Prepare testimonial request", workflowArea: "Reputation", targetType: "JOB", targetId: job.id, status: "QUEUED", prompt: "Draft a simple testimonial request for project closeout after final walkthrough.", dueDate: new Date(Date.now() + 21 * 86400000) }
    ]
  });

  await prisma.importJob.createMany({
    data: [
      { organizationId: org.id, importType: "Contacts", sourceSystem: "CSV export", fileName: "contacts.csv", status: "READY", totalRows: 120, importedRows: 0, failedRows: 0, mapping: { name: "profileName", email: "email", phone: "phone" } },
      { organizationId: org.id, importType: "Cost Catalog", sourceSystem: "Spreadsheet", fileName: "cost-catalog.xlsx", status: "MAPPING", totalRows: 300, importedRows: 0, failedRows: 0, mapping: { category: "category", service: "serviceName", unit: "unitType" } },
      { organizationId: org.id, importType: "Jobs", sourceSystem: "Existing construction app", fileName: "jobs.csv", status: "UPLOADED", totalRows: 24, importedRows: 0, failedRows: 0 }
    ]
  });

  const subcontractorBody = [
    "FlipSide Renovations subcontractor agreement workflow shell.",
    "This record is intended for workflow tracking and should be replaced with counsel-reviewed agreement language before production use.",
    "Core tracking areas include scope of work, insurance requirements, safety requirements, payment terms, change authorization, confidentiality, cleanup, documentation, and dispute process."
  ].join("\n\n");
  let subTemplate = await prisma.agreementTemplate.findFirst({ where: { organizationId: org.id, templateName: "FlipSide Subcontractor Agreement" } });
  if (subTemplate) {
    subTemplate = await prisma.agreementTemplate.update({
      where: { id: subTemplate.id },
      data: {
        summary: "Subcontractor agreement tracking template based on FlipSide operational needs. Requires legal review before production use.",
        body: subcontractorBody
      }
    });
  } else {
    subTemplate = await prisma.agreementTemplate.create({
      data: {
      organizationId: org.id,
      templateName: "FlipSide Subcontractor Agreement",
      agreementType: "Subcontractor",
      jurisdiction: "Multi-state",
      version: "0.1",
      summary: "Subcontractor agreement tracking template based on FlipSide operational needs. Requires legal review before production use.",
      body: subcontractorBody,
      counselReviewed: false
      }
    }
    );
  }
  const existingAgreement = await prisma.agreement.findFirst({ where: { agreementTemplateId: subTemplate.id, profileId: profiles[6].id } });
  if (!existingAgreement) {
    await prisma.agreement.create({
      data: {
        organizationId: org.id,
        agreementTemplateId: subTemplate.id,
        profileId: profiles[6].id,
        jobId: job.id,
        agreementName: "Whitaker Tile subcontractor agreement",
        agreementType: "Subcontractor",
        jurisdiction: "Texas / Multi-state review needed",
        status: "SENT",
        bodySnapshot: subcontractorBody,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
        notes: "Sample agreement record. Replace workflow shell language with counsel-reviewed document before production.",
        auditEvents: {
          create: [
            { eventType: "created", actorEmail: email, metadata: { source: "seed" } },
            { eventType: "sent", actorEmail: email, metadata: { delivery: "manual sample" } }
          ]
        }
      }
    });
  }

  const sowBody = [
    "FlipSide renovation scope-of-work workflow shell.",
    "Use this as an operational shell for phase, area, description, unit, quantity, exclusions, allowances, owner-provided materials, contractor-provided materials, change-order triggers, and client approval checkpoints.",
    "This is not legal advice and should be reviewed by qualified counsel for each state, project type, licensing rule, lien notice requirement, consumer notice requirement, and contract amount threshold before production use."
  ].join("\n\n");
  const existingSowTemplate = await prisma.agreementTemplate.findFirst({ where: { organizationId: org.id, templateName: "FlipSide Renovation SOW Master Template" } });
  if (existingSowTemplate) {
    await prisma.agreementTemplate.update({
      where: { id: existingSowTemplate.id },
      data: {
        agreementType: "Scope of Work",
        jurisdiction: "Multi-state counsel review required",
        summary: "Operational SOW shell based on FlipSide phase/area/unit workflow. Requires counsel review before contract use.",
        body: sowBody,
        counselReviewed: false
      }
    });
  } else {
    await prisma.agreementTemplate.create({
      data: {
        organizationId: org.id,
        templateName: "FlipSide Renovation SOW Master Template",
        agreementType: "Scope of Work",
        jurisdiction: "Multi-state counsel review required",
        version: "0.1",
        summary: "Operational SOW shell based on FlipSide phase/area/unit workflow. Requires counsel review before contract use.",
        body: sowBody,
        counselReviewed: false
      }
    });
  }

  await prisma.profile.update({
    where: { id: profiles[6].id },
    data: {
      w9Status: "REQUESTED",
      w9RequestedAt: new Date(),
      vendorOnboardingStatus: "DOCS_PENDING",
      complianceNotes: "Collect W-9, insurance certificate, signed subcontractor agreement, and trade/service tags before assigning new work."
    }
  });

  await prisma.translationRecord.create({
    data: {
      organizationId: org.id,
      sourceType: "ClientPortalUpdate",
      sourceId: job.id,
      sourceLocale: "en",
      targetLocale: "es",
      sourceText: "This week focused on confirming selections and sequencing rough trades.",
      translatedText: "Esta semana se enfocó en confirmar selecciones y coordinar los trabajos preliminares.",
      status: "HUMAN_REVIEW_NEEDED",
      provider: "Sample translation workflow",
      notes: "Dynamic translation record for future AI/provider integration with human review."
    }
  });

  await prisma.vendorQuote.createMany({
    data: [
      { organizationId: org.id, costCatalogItemId: catalogItems[7].id, quoteLineItemId: null, vendorName: "Whitaker Tile", quotedAmount: 12400, confidenceLevel: "HIGH", notes: "Seed vendor quote for tile labor and setting materials." },
      { organizationId: org.id, costCatalogItemId: catalogItems[18].id, quoteLineItemId: null, vendorName: "Austin Electric Partner", quotedAmount: 6800, confidenceLevel: "HIGH", notes: "Seed electrical rough-in quote." },
      { organizationId: org.id, costCatalogItemId: catalogItems[24].id, quoteLineItemId: null, vendorName: "Central Plumbing Partner", quotedAmount: 7400, confidenceLevel: "HIGH", notes: "Seed plumbing quote." }
    ]
  });

  await prisma.actualCost.createMany({
    data: [
      { organizationId: org.id, jobId: job.id, costCatalogItemId: catalogItems[0].id, costType: "Labor", description: "Kitchen demo labor", estimatedAmount: 2100, actualAmount: 2350, varianceAmount: 250, source: "Seed actual" },
      { organizationId: org.id, jobId: job.id, costCatalogItemId: catalogItems[7].id, costType: "Subcontractor", description: "Tile install", estimatedAmount: 12400, actualAmount: 11950, varianceAmount: -450, source: "Vendor invoice" },
      { organizationId: org.id, jobId: job.id, costCatalogItemId: catalogItems[12].id, costType: "Material", description: "Paint and prep material", estimatedAmount: 1650, actualAmount: 1810, varianceAmount: 160, source: "Receipt upload" }
    ]
  });

  const weeklyReportData = [
    {
      weekEnding: new Date(Date.now() - 0 * 7 * 86400000),
      workCompleted: "Tile work in primary bath is 80% complete. Kitchen cabinet punch list underway. Countertop template completed — fabrication ordered.",
      issuesFound: "Tile grout joint width variance on one wall — Whitaker corrected same day. No impact to schedule.",
      decisionsNeeded: "Client needs to select cabinet pull finish (matte black vs brushed nickel) before hardware order.",
      budgetNotes: "Subfloor change order ($2,800) pending client signature. No other budget variance this week.",
      scheduleNotes: "On track for target completion. Countertop install in 12 days — countertop is the critical path.",
      nextWeekPlan: "Complete tile and grout in bath. Start kitchen backsplash. Coordinate plumbing trim-out after countertop template.",
      clientSummary: "Great progress this week. Bath tile is almost done and looking sharp. Kitchen cabinets are punched out. Next milestone is countertop install — once that's in, plumbing trim-out follows fast.",
      internalNotes: "Protect change order discipline. Three unsigned COs — get signatures before continuing scope.",
      photos: [PHOTOS.tileWork, PHOTOS.cabinetry, PHOTOS.kitchenAfter2],
      sentAt: new Date(Date.now() - 1 * 86400000)
    },
    {
      weekEnding: new Date(Date.now() - 1 * 7 * 86400000),
      workCompleted: "Electrical rough-in inspection passed. Primary bath waterproofing complete — backer board and Kerdi membrane. Kitchen cabinet delivery and staging complete.",
      issuesFound: "Soft spot in subfloor at shower base — water damage from original pan failure. Documented and change order prepared.",
      decisionsNeeded: "Tile layout direction for shower walls needs client approval before Whitaker starts install.",
      budgetNotes: "Subfloor repair change order submitted: $2,800 added cost, 2 days added. Awaiting signature.",
      scheduleNotes: "Waterproofing cure time 24 hours — tile can start Wednesday. Overall schedule still on track.",
      nextWeekPlan: "Start tile installation in primary bath. Continue kitchen cabinet install. Template countertops by Friday.",
      clientSummary: "The rough-in inspection passed — electrical and plumbing are signed off. Bath waterproofing is done and cured. We found some old water damage under the shower base and we're handling it — change order in your inbox for review.",
      internalNotes: "Ensure subfloor CO is signed before waterproofing phase closes out.",
      photos: [PHOTOS.drywall, PHOTOS.roughIn, PHOTOS.framing],
      sentAt: new Date(Date.now() - 8 * 86400000)
    }
  ];
  for (const report of weeklyReportData) {
    await prisma.weeklyReport.create({ data: { jobId: job.id, ...report } });
  }

  await prisma.changeOrder.createMany({
    data: [
      { jobId: job.id, clientProfileId: profiles[2].id, changeOrderTitle: "Upgrade primary bath tile — textured porcelain", addedCost: 4200, addedTime: 3, status: "SENT", reason: "Client selected above-allowance tile. Approved verbally, awaiting written sign-off." },
      { jobId: job.id, clientProfileId: profiles[2].id, changeOrderTitle: "Replace concealed subfloor damage — bath wet area", addedCost: 2800, addedTime: 2, status: "SENT", fieldCondition: "Soft subfloor discovered after demo. Water intrusion from failed shower pan. Requires sistering and board replacement before waterproofing can proceed." },
      { jobId: job.id, clientProfileId: profiles[2].id, changeOrderTitle: "Add under-cabinet lighting — kitchen peninsula", addedCost: 1850, addedTime: 1, status: "SENT", reason: "Owner requested during electrical rough-in walkthrough. Easiest point to add before drywall closes." }
    ]
  });

  // INV-1001: $25k total, $15k paid → $10k balance (PARTIALLY_PAID)
  const invoice = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-1001" },
    update: { jobId: job.id, clientProfileId: profiles[2].id },
    create: {
      jobId: job.id,
      clientProfileId: profiles[2].id,
      invoiceNumber: "INV-1001",
      dueDate: new Date(Date.now() + 7 * 86400000),
      subtotal: 25000, tax: 0, total: 25000, amountPaid: 15000, balanceDue: 10000,
      status: "PARTIALLY_PAID",
      notes: "Mobilization and deposit invoice. Balance due at rough-in completion."
    }
  });

  const existingSeedPayment = await prisma.payment.findFirst({ where: { invoiceId: invoice.id, notes: "Seed ACH payment." } });
  if (!existingSeedPayment) {
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id, clientProfileId: profiles[2].id,
        amount: 15000, method: "ACH", status: "COMPLETED", notes: "Seed ACH payment."
      }
    });
  }

  // INV-1002 and INV-1003 created below after job2/job3 are declared

  await prisma.financing.create({
    data: {
      clientProfileId: profiles[0].id,
      quoteId: quotes[0].id,
      financingNeeded: true,
      desiredAmount: 85000,
      status: "CLIENT_INTERESTED",
      provider: "Third-party provider pending configuration",
      applicationUrl: "https://example.com/application",
      notes: "Financing tracked only; no lending integration is active."
    }
  });

  // ── Two additional active jobs for the watchlist ────────────────────────────

  const job2 = await prisma.job.create({
    data: {
      organizationId: org.id,
      jobName: "Cedar Ridge Ln - Duplex Unit A Turn",
      clientProfileId: profiles[8].id,
      propertyId: properties[2].id,
      jobStatus: "DEMO",
      startDate: new Date(Date.now() - 10 * 86400000),
      targetCompletion: new Date(Date.now() + 38 * 86400000),
      contractAmount: 54800,
      amountPaid: 18000,
      balanceDue: 36800,
      activePhase: "Demolition / Prep",
      weeklyReportDue: new Date(Date.now() - 1 * 86400000),
      riskLevel: "LOW",
      notes: "Investor turn — Unit A. Flooring, kitchen refresh, paint. Straightforward scope.",
      phases: {
        create: renovationPhaseDetails.map(([phaseName, description], index) => ({
          phaseNumber: index + 1, phaseName,
          status: index < 1 ? "COMPLETE" : index === 1 ? "IN_PROGRESS" : "NOT_STARTED",
          clientUpdate: description,
          completionCriteria: "Photos, scope confirmation, risk review, and client-ready update are complete."
        }))
      }
    },
    include: { phases: true }
  });

  await prisma.jobPhoto.createMany({
    data: [
      { jobId: job2.id, url: PHOTOS.exterior, label: "BEFORE", phase: "Pre-Construction", roomArea: "Exterior", caption: "Unit A exterior before work begins. Good structure, needs cosmetic refresh.", takenAt: new Date(Date.now() - 11 * 86400000) },
      { jobId: job2.id, url: PHOTOS.framing, label: "DURING", phase: "Demolition / Prep", roomArea: "Kitchen", caption: "Kitchen demo in progress. Removing dated cabinets and laminate flooring.", takenAt: new Date(Date.now() - 3 * 86400000) },
    ]
  });

  const job3 = await prisma.job.create({
    data: {
      organizationId: org.id,
      jobName: "Mesa Vista Dr - Kitchen Expansion",
      clientProfileId: profiles[3].id,
      propertyId: properties[3].id,
      jobStatus: "FINISHES",
      startDate: new Date(Date.now() - 63 * 86400000),
      targetCompletion: new Date(Date.now() + 7 * 86400000),
      contractAmount: 89400,
      amountPaid: 71500,
      balanceDue: 17900,
      activePhase: "Finish Install",
      weeklyReportDue: new Date(Date.now() + 3 * 86400000),
      riskLevel: "MEDIUM",
      notes: "Luxury home kitchen expansion. Custom cabinetry, quartz, appliance package. Approaching closeout.",
      phases: {
        create: renovationPhaseDetails.map(([phaseName, description], index) => ({
          phaseNumber: index + 1, phaseName,
          status: index < 7 ? "COMPLETE" : index === 7 ? "IN_PROGRESS" : "NOT_STARTED",
          clientUpdate: description,
          completionCriteria: "Photos, scope confirmation, risk review, and client-ready update are complete."
        }))
      }
    },
    include: { phases: true }
  });

  await prisma.jobPhoto.createMany({
    data: [
      { jobId: job3.id, url: PHOTOS.kitchenBefore, label: "BEFORE", phase: "Pre-Construction", roomArea: "Kitchen", caption: "Original kitchen — limited layout, dated appliances. Expansion adds 140 sq ft.", takenAt: new Date(Date.now() - 64 * 86400000) },
      { jobId: job3.id, url: PHOTOS.cabinetry, label: "DURING", phase: "Finish Install", roomArea: "Kitchen", caption: "Custom inset cabinet install in progress — all uppers hung and level.", takenAt: new Date(Date.now() - 5 * 86400000) },
      { jobId: job3.id, url: PHOTOS.kitchenAfter, label: "AFTER", phase: "Finish Install", roomArea: "Kitchen", caption: "Kitchen near-complete — countertop installed, appliances staged for delivery Thursday.", takenAt: new Date(Date.now() - 2 * 86400000) },
    ]
  });

  // ── Additional invoices — now that job2 exists ───────────────────────────────
  await prisma.invoice.deleteMany({ where: { invoiceNumber: { in: ["INV-1002", "INV-1003"] } } });

  // INV-1002: Hartmann Ave rough-in progress — $22,500 outstanding
  const inv2 = await prisma.invoice.create({
    data: {
      jobId: job.id, clientProfileId: profiles[0].id,
      invoiceNumber: "INV-1002",
      dueDate: new Date(Date.now() - 3 * 86400000),
      subtotal: 28000, tax: 0, total: 28000, amountPaid: 5500, balanceDue: 22500,
      status: "PARTIALLY_PAID",
      notes: "Rough-in progress payment. $22,500 balance due on receipt. Electrical and plumbing rough-in complete and inspected."
    }
  });
  await prisma.payment.create({
    data: {
      invoiceId: inv2.id, clientProfileId: profiles[0].id,
      amount: 5500, method: "CHECK", status: "COMPLETED", notes: "Partial payment — check received."
    }
  });

  // INV-1003: Cedar Ridge Unit A — Andre King, $14,700 overdue
  const inv3 = await prisma.invoice.create({
    data: {
      jobId: job2.id, clientProfileId: profiles[8].id,
      invoiceNumber: "INV-1003",
      dueDate: new Date(Date.now() - 12 * 86400000),
      subtotal: 18700, tax: 0, total: 18700, amountPaid: 4000, balanceDue: 14700,
      status: "SENT",
      notes: "Cedar Ridge Unit A — flooring and paint scope. Invoice past due 12 days. Call Andre re: payment timing."
    }
  });
  await prisma.payment.create({
    data: {
      invoiceId: inv3.id, clientProfileId: profiles[8].id,
      amount: 4000, method: "ZELLE", status: "COMPLETED", notes: "Partial payment via Zelle at mobilization."
    }
  });
  // Outstanding total: INV-1001 $10k + INV-1002 $22.5k + INV-1003 $14.7k = $47,200 ✓

  // ── Testimonials / feedback (drive the proof engine section) ────────────────
  await prisma.feedbackRequest.updateMany({
    where: { jobId: job.id, requestType: "Mid-project client pulse" },
    data: {
      status: "RECEIVED",
      rating: 5,
      feedback: "Communication has been exceptional. We always know what's happening without having to ask.",
      publicTestimonial: "Marcus keeps us fully in the loop every week. The reports are clear, the photos are great, and when we needed a change order they had it documented and to us the same day. Best contractor experience we've ever had."
    }
  });

  // ── Rich activity feed — every entry has a DIFFERENT person so dashboard looks varied ─────
  await prisma.activity.createMany({
    data: [
      // Overdue — shows in red on dashboard
      { relatedProfileId: profiles[8].id, relatedLeadId: leads[4].id, activityType: "FOLLOW_UP", subject: "Follow up: King — Cedar Ridge Unit B timing", body: "Andre confirmed Unit A budget. Ask about Unit B scope and whether he wants to schedule a walkthrough now.", dueDate: new Date(Date.now() - 1 * 86400000) },
      // Due today
      { relatedProfileId: profiles[1].id, activityType: "CALL", subject: "Call Diego Vega — confirm Morales listing referral", body: "Diego referred the Morales pre-list kitchen. Call to lock timeline and ask whether the client needs a design consult first.", dueDate: new Date(Date.now()) },
      // Due tomorrow
      { relatedProfileId: profiles[5].id, activityType: "EMAIL", subject: "Send Rachel Torres — Flipside investor portfolio PDF", body: "Capitol City PM requested a summary of recent investor turns. Send PDF with Cedar Ridge before/after photos and ROI notes.", dueDate: new Date(Date.now() + 1 * 86400000) },
      // Due in 2 days
      { relatedProfileId: profiles[7].id, activityType: "FOLLOW_UP", subject: "Carol Park — request Google review for Mesa Vista", body: "Mesa Vista kitchen is wrapping up. This is the right moment to ask Carol for a Google review and testimonial.", dueDate: new Date(Date.now() + 2 * 86400000) },
      // Due in 3 days
      { relatedProfileId: profiles[4].id, activityType: "EMAIL", subject: "Priya Desai — tile selection decision needed this week", body: "Priya is designing the Brewster master bath expansion. Selections are due before Whitaker can schedule tile install.", dueDate: new Date(Date.now() + 3 * 86400000) },
    ]
  });

  const allJobs = await prisma.job.findMany({ select: { id: true } });
  for (const existingJob of allJobs) {
    for (const [index, [phaseName, description]] of renovationPhaseDetails.entries()) {
      const phaseNumber = index + 1;
      await prisma.renovationPhase.upsert({
        where: { jobId_phaseNumber: { jobId: existingJob.id, phaseNumber } },
        update: {
          phaseName,
          clientUpdate: description,
          completionCriteria: `Phase ${phaseNumber} is complete when ${phaseName.toLowerCase()} work is verified, required proof is attached, blockers are resolved, and client-facing status is ready.`
        },
        create: {
          jobId: existingJob.id,
          phaseNumber,
          phaseName,
          clientUpdate: description,
          completionCriteria: `Phase ${phaseNumber} is complete when ${phaseName.toLowerCase()} work is verified, required proof is attached, blockers are resolved, and client-facing status is ready.`
        }
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
