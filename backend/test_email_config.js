const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEmailConfig() {
  try {
    console.log('Testing EmailConfig...');
    
    // Find first tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('No tenant found in DB, skipping test.');
      return;
    }
    console.log('Using tenant:', tenant.id);
    
    // Create or update
    const updated = await prisma.emailConfig.upsert({
      where: { tenantId: tenant.id },
      update: { host: 'smtp.test.com', port: 587, secure: false, user: 'test', password: 'password123', fromName: 'Test Name', fromEmail: 'test@test.com' },
      create: { tenantId: tenant.id, host: 'smtp.test.com', port: 587, secure: false, user: 'test', password: 'password123', fromName: 'Test Name', fromEmail: 'test@test.com' },
    });
    console.log('Upsert successful:', updated);
    
    // Fetch
    const fetched = await prisma.emailConfig.findUnique({ where: { tenantId: tenant.id } });
    console.log('Fetch successful:', fetched);
    
    // Cleanup
    await prisma.emailConfig.delete({ where: { tenantId: tenant.id } });
    console.log('Cleanup successful.');
    
    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailConfig();
