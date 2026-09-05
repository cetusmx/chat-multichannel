require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const configs = await prisma.aiConfig.findMany();
  console.log("AiConfigs:", configs);
}
main().finally(() => prisma.$disconnect());
