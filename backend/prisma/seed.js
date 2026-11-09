/**
 * Development / CI demo data. Never run this in production: use prisma/bootstrap.js,
 * which is idempotent and reads credentials from the environment.
 */
if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') {
  console.log('[SEED] NODE_ENV=production sin SEED_DEMO=true: se omiten los datos demo.');
  process.exit(0);
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { domain: 'demo.salesflow.app' },
    update: {},
    create: { name: 'Demo Company', domain: 'demo.salesflow.app', phone: '555-0000', email: 'contacto@democompany.com', address: 'Av. Principal 123, Ciudad de México' },
  });

  const branch = await prisma.branch.upsert({
    where: { id: 'demo-branch' },
    update: {},
    create: { id: 'demo-branch', name: 'Sucursal Principal', tenantId: tenant.id },
  });

  await prisma.groupVendor.deleteMany({
    where: { group: { name: 'Grupo General', id: { not: 'demo-group' } } },
  });
  await prisma.group.deleteMany({
    where: { name: 'Grupo General', id: { not: 'demo-group' } },
  });

  const group = await prisma.group.upsert({
    where: { id: 'demo-group' },
    update: {},
    create: { id: 'demo-group', name: 'Grupo General', branchId: branch.id },
  });

  const bcrypt = require('bcryptjs');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { phone: '555-0100' },
    create: {
      name: 'Admin Demo', email: 'admin@demo.com', phone: '555-0100',
      passwordHash: await bcrypt.hash('admin123', 10), role: 'ADMIN', tenantId: tenant.id,
    },
  });

  const coord = await prisma.user.upsert({
    where: { email: 'coord@demo.com' },
    update: { phone: '555-0101' },
    create: {
      name: 'Coordi Perez', email: 'coord@demo.com', phone: '555-0101',
      passwordHash: await bcrypt.hash('coord123', 10), role: 'COORDINATOR', tenantId: tenant.id,
    },
  });

  await prisma.groupVendor.upsert({
    where: { groupId_userId: { groupId: group.id, userId: coord.id } },
    update: {},
    create: { groupId: group.id, userId: coord.id },
  });

  const vendor = await prisma.user.upsert({
    where: { email: 'vendor@demo.com' },
    update: { phone: '555-0102', coordinatorId: coord.id },
    create: {
      name: 'Vendedor Lopez', email: 'vendor@demo.com', phone: '555-0102',
      passwordHash: await bcrypt.hash('vendor123', 10), role: 'VENDOR',
      tenantId: tenant.id, coordinatorId: coord.id,
    },
  });

  await prisma.groupVendor.upsert({
    where: { groupId_userId: { groupId: group.id, userId: vendor.id } },
    update: {},
    create: { groupId: group.id, userId: vendor.id },
  });

  console.log('Seed completed:', { tenant: tenant.id, admin: admin.id, coord: coord.id, vendor: vendor.id });

  // -------------------------
  // SUPERADMIN SEED
  // -------------------------
  const superadminEmail = 'admin@algor.mx';
  const superadminPwd = await bcrypt.hash('superpassword123', 10);
  
  const superadmin = await prisma.superadmin.upsert({
    where: { email: superadminEmail },
    update: {}, // never reset an existing superadmin password
    create: {
      email: superadminEmail,
      name: 'Superadmin Algor',
      passwordHash: superadminPwd,
    },
  });

  console.log('Superadmin Seed completed:', superadmin.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
