import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog');"
  );
  console.log("TABLES FOUND IN NEON:", tables);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
