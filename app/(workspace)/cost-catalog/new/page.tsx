import { requireStaffPage } from "@/lib/staff-access";
import { createCatalogItem } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { catalogCategories } from "@/lib/constants";
import { options } from "@/lib/form-options";

export default async function NewCatalogItemPage() {
  await requireStaffPage();
  return (
    <>
      <PageHeader title="New catalog item" body="Add an editable internal planning cost item. These are not copied from Homewyse or any external catalog." />
      <EntityForm
        formKey="catalog"
        action={createCatalogItem}
        fields={[
          { name: "category", label: "Category", type: "select", options: catalogCategories.map((c) => ({ label: c, value: c })) },
          { name: "serviceName", label: "Service name" },
          { name: "unitType", label: "Unit type", defaultValue: "each" },
          { name: "typicalQuantityRange", label: "Typical quantity range" },
          { name: "flipsideLowCost", label: "Low cost", type: "number" },
          { name: "flipsideTargetCost", label: "Target cost", type: "number" },
          { name: "flipsideHighCost", label: "High cost", type: "number" },
          { name: "markup", label: "Markup %", type: "number", defaultValue: 18 },
          { name: "riskFactor", label: "Risk factor", type: "select", options: options.riskLevels, defaultValue: "MEDIUM" },
          { name: "complexityLevel", label: "Complexity" },
          { name: "permitTrigger", label: "Permit trigger" },
          { name: "licensedTradeRequired", label: "Licensed trade required", type: "checkbox" },
          { name: "laborAssumptions", label: "Labor assumptions", type: "textarea" },
          { name: "materialAssumptions", label: "Material assumptions", type: "textarea" },
          { name: "austinNotes", label: "Austin notes", type: "textarea" },
          { name: "active", label: "Active", type: "checkbox", defaultValue: true }
        ]}
      />
    </>
  );
}
