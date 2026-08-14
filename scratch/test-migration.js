const assert = require('assert');
const { PrismaClient } = require('../backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Testing DB Migration for Advanced Lifecycle States...');

  let tenant;
  try {
    // 1. Test Tenant creation with new SLA fields
    console.log('Creating Test Tenant...');
    tenant = await prisma.tenant.create({
      data: {
        name: 'SLA Test Tenant',
        domain: 'sla-test-' + Date.now() + '.com',
        isSlaEnabled: false, // Testing new field
        autoCloseInactiveHours: 24, // Testing new field
      },
    });
    console.log('Tenant created:', tenant.id);

    // 2. Create Client
    const client = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        phoneNumber: '5551234567',
        name: 'Test Client',
      },
    });

    // 3. Test Conversation creation with new metadata fields and Enum states
    console.log('Creating Conversation in ON_HOLD state...');
    let conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        status: 'ON_HOLD',
        onHoldReason: 'Awaiting third-party response',
        onHoldExpiration: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
      },
    });
    console.log('Conversation created successfully with ID:', conversation.id);
    console.log('Status:', conversation.status);
    console.log('Reason:', conversation.onHoldReason);

    // 4. Test Transition back to ACTIVE (nullifying fields)
    console.log('Transitioning Conversation to ACTIVE...');
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: 'ACTIVE',
      },
    });
    console.log('Conversation transitioned successfully.');
    assert.strictEqual(conversation.status, 'ACTIVE', 'Status should be ACTIVE');
    assert.strictEqual(conversation.onHoldReason, null, 'onHoldReason should be nullified by trigger');
    assert.strictEqual(conversation.onHoldExpiration, null, 'onHoldExpiration should be nullified by trigger');
    assert.strictEqual(conversation.scheduledAt, null, 'scheduledAt should be nullified by trigger');
    console.log('New Status:', conversation.status);
    console.log('Status Updated At (from trigger):', conversation.statusUpdatedAt);
    console.log('All paused metadata successfully nullified!');

    console.log('Test completed successfully.');
  } catch (error) {
    console.error('Test failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('Cleaning up mock records...');
    // Only delete records associated with the tenant we created
    if (tenant) {
      await prisma.conversation.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.client.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    }
    console.log('Cleanup complete.');
    await prisma.$disconnect();
  }
}

main();
