const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const c = await prisma.client.findFirst({
    where: { cartData: { not: null } }
  });
  console.log(JSON.stringify(c.cartData, null, 2));
}

run().catch(console.error).finally(()=>prisma.$disconnect());
