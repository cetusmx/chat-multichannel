require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const chunks = await prisma.documentChunk.findMany({
    where: { text: { contains: 'Seal Market' } }
  });
  console.log("Chunks with Seal Market:", chunks);
  const rules = await prisma.aiRule.findMany();
  console.log("AiRules:", rules);
}
main().finally(() => prisma.$disconnect());
