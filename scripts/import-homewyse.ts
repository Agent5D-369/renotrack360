import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { importHomewyseCatalog } from "../lib/homewyse-catalog";

async function main() {
  const path = process.argv[2], actorId = process.env.HOMEWYSE_IMPORT_ACTOR_ID;
  if (!path || !actorId || !process.env.DATABASE_URL) throw Error("Provide an import file, DATABASE_URL and HOMEWYSE_IMPORT_ACTOR_ID.");
  const local = ["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname);
  if (!local && !process.argv.includes("--authorized-production-import")) throw Error("Remote import requires --authorized-production-import.");
  const db = new PrismaClient({ log: [] });
  try { console.log(JSON.stringify(await importHomewyseCatalog(db, actorId, JSON.parse(readFileSync(path, "utf8"))))); }
  finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error.name === "ZodError" ? JSON.stringify(error.issues.slice(0, 5)) : (error.code || "Catalog import failed; no credentials logged.")); process.exitCode = 1; });
