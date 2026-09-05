require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const docs = await prisma.document.findMany();
  console.log("Documents:", docs);
}
main().finally(() => prisma.$disconnect());
