const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING FOR DUPLICATE PROFILES ===");
  const duplicates = await prisma.$queryRaw`
    SELECT "profileName", COUNT(*) as cnt 
    FROM "Profile" 
    GROUP BY "profileName" 
    HAVING COUNT(*) > 1 
    ORDER BY cnt DESC
  `;
  console.log("Duplicates:", JSON.stringify(duplicates, null, 2));

  console.log("\n=== TOTAL PROFILE COUNT ===");
  const total = await prisma.profile.count();
  console.log("Total profiles:", total);

  console.log("\n=== INVOICE DATA ===");
  const invoices = await prisma.$queryRaw`
    SELECT "invoiceNumber", status, "balanceDue" 
    FROM "Invoice" 
    ORDER BY "invoiceNumber"
  `;
  console.log("Invoices:", JSON.stringify(invoices, null, 2));

  console.log("\n=== ESTIMATE FOLLOW-UPS ===");
  const followups = await prisma.$queryRaw`
    SELECT "followUpType", status, "dueDate" 
    FROM "EstimateFollowUp" 
    ORDER BY "dueDate" 
    LIMIT 10
  `;
  console.log("Follow-ups:", JSON.stringify(followups, null, 2));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
