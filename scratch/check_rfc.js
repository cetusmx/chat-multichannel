const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      cartData: { not: null }
    },
    take: 5
  });
  console.log("CLIENTS CART DATA:");
  clients.forEach(c => {
    console.log(JSON.stringify(c.cartData, null, 2));
  });

  const conversations = await prisma.conversation.findMany({
    where: {
      cartSnapshot: { not: null }
    },
    take: 5
  });
  console.log("CONVERSATIONS CART SNAPSHOT:");
  conversations.forEach(c => {
    console.log(JSON.stringify(c.cartSnapshot, null, 2));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
