require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const kb = await prisma.documentChunk.findMany();
  console.log("KB chunks:", kb.length);
  if (kb.length > 0) {
     console.log("First chunk:", kb[0].text);
  }
}
main().finally(() => prisma.$disconnect());
