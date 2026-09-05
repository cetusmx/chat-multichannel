const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      cartData: { not: null }
    },
    take: 1
  });
  console.log("CLIENTS CART DATA:");
  clients.forEach(c => {
    console.log(JSON.stringify(c.cartData, null, 2));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
