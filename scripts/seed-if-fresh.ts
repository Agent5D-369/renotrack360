import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count === 0) {
    console.log("Fresh database detected — running seed...");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  } else {
    console.log(`Database has ${count} user(s) — skipping seed.`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
