import { updateCatalog } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { catalogCategories } from "@/lib/constants";
import { options } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function EditCatalogItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.costCatalogItem.findUniqueOrThrow({ where: { id } });

  return (
    <>
      <PageHeader title={`Edit: ${item.serviceName}`} body="Update pricing, assumptions, and catalog metadata." />
      <EntityForm
        formKey="catalog"
        action={updateCatalog.bind(null, item.id)}
        submitLabel="Save changes"
        fields={[
          { name: "category", label: "Category", type: "select", options: catalogCategories.map((c) => ({ label: c, value: c })), defaultValue: item.category },
          { name: "serviceName", label: "Service name", defaultValue: item.serviceName },
          { name: "unitType", label: "Unit type", defaultValue: item.unitType },
          { name: "typicalQuantityRange", label: "Typical quantity range", defaultValue: item.typicalQuantityRange },
          { name: "flipsideLowCost", label: "Low cost", type: "number", defaultValue: Number(item.flipsideLowCost) },
          { name: "flipsideTargetCost", label: "Target cost", type: "number", defaultValue: Number(item.flipsideTargetCost) },
          { name: "flipsideHighCost", label: "High cost", type: "number", defaultValue: Number(item.flipsideHighCost) },
          { name: "markup", label: "Markup %", type: "number", defaultValue: Number(item.markup) },
          { name: "riskFactor", label: "Risk factor", type: "select", options: options.riskLevels, defaultValue: item.riskFactor },
          { name: "complexityLevel", label: "Complexity", defaultValue: item.complexityLevel },
          { name: "permitTrigger", label: "Permit trigger", defaultValue: item.permitTrigger },
          { name: "licensedTradeRequired", label: "Licensed trade required", type: "checkbox", defaultValue: item.licensedTradeRequired },
          { name: "laborAssumptions", label: "Labor assumptions", type: "textarea", defaultValue: item.laborAssumptions },
          { name: "materialAssumptions", label: "Material assumptions", type: "textarea", defaultValue: item.materialAssumptions },
          { name: "laborRange", label: "Labor range", defaultValue: item.laborRange },
          { name: "materialRange", label: "Material range", defaultValue: item.materialRange },
          { name: "austinNotes", label: "Market notes", type: "textarea", defaultValue: item.austinNotes },
          { name: "referenceUrl", label: "Reference URL", defaultValue: item.referenceUrl },
          { name: "vendorQuoteNotes", label: "Vendor quote notes", type: "textarea", defaultValue: item.vendorQuoteNotes },
          { name: "projectHistoryNotes", label: "Project history notes", type: "textarea", defaultValue: item.projectHistoryNotes },
          { name: "internalPricingNotes", label: "Internal pricing notes", type: "textarea", defaultValue: item.internalPricingNotes },
          { name: "active", label: "Active", type: "checkbox", defaultValue: item.active }
        ]}
      />
    </>
  );
}
