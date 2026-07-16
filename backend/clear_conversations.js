const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.conversation.deleteMany();
  console.log(`Deleted ${result.count} conversations.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
