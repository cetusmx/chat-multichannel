require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.cannedResponse.findMany();
  console.log("Canned Responses:", c);
}
main().finally(() => prisma.$disconnect());
