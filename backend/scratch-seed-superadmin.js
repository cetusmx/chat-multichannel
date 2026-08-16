const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('superpassword123', 10);
  
  const superadmin = await prisma.superadmin.upsert({
    where: { email: 'admin@algor.mx' },
    update: { passwordHash, name: 'Admin Algor' },
    create: {
      email: 'admin@algor.mx',
      name: 'Admin Algor',
      passwordHash
    }
  });

  console.log('Created Superadmin:', superadmin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
