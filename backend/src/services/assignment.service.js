const prisma = require('../config/database');
const { getIo } = require('../socket');

class AssignmentService {
  async getConfig(tenantId) {
    try {
      const includeVendorUser = {
        eligibleVendors: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      };

      let rule = await prisma.assignmentRule.findUnique({
        where: { tenantId },
        include: includeVendorUser
      });

      if (!rule) {
        try {
          rule = await prisma.assignmentRule.create({
            data: {
              tenantId,
              strategy: 'MANUAL',
            },
            include: includeVendorUser
          });
        } catch (err) {
          // If another request created it concurrently, P2002 Unique constraint failed
          if (err.code === 'P2002') {
            rule = await prisma.assignmentRule.findUnique({
              where: { tenantId },
              include: includeVendorUser
            });
          } else {
            throw err;
          }
        }
      }

      return {
        data: {
          strategy: rule.strategy,
          activeVendors: rule.eligibleVendors.map(ev => ev.user)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async updateConfig(tenantId, data) {
    try {
      const { strategy, activeVendorIds: rawActiveVendorIds = [] } = data || {};
      
      // De-duplicate array and enforce empty vendors for MANUAL strategy
      const safeVendorIds = Array.isArray(rawActiveVendorIds) ? rawActiveVendorIds : [];
      const activeVendorIds = strategy === 'MANUAL' ? [] : [...new Set(safeVendorIds)];

      if (strategy === 'ROUND_ROBIN' && activeVendorIds.length === 0) {
        const error = new Error('Se requiere al menos un vendedor para la estrategia ROUND_ROBIN.');
        error.status = 400;
        throw error;
      }

      await prisma.$transaction(async (tx) => {
        // Verify vendors belong to tenant and are VENDOR role (TOCTOU protection)
        if (activeVendorIds.length > 0) {
          const validVendors = await tx.user.findMany({
            where: {
              id: { in: activeVendorIds },
              tenantId,
              role: 'VENDOR'
            }
          });

          if (validVendors.length !== activeVendorIds.length) {
            const error = new Error('One or more selected vendors are invalid or do not belong to this tenant.');
            error.status = 400;
            throw error;
          }
        }

        // Upsert the assignment rule
        const rule = await tx.assignmentRule.upsert({
          where: { tenantId },
          update: { strategy },
          create: {
            tenantId,
            strategy
          }
        });

        // Update eligible vendors (delete all existing and recreate)
        await tx.eligibleVendor.deleteMany({
          where: { ruleId: rule.id }
        });

        if (activeVendorIds.length > 0) {
          const eligibleVendorData = activeVendorIds.map(userId => ({
            ruleId: rule.id,
            userId
          }));
          await tx.eligibleVendor.createMany({
            data: eligibleVendorData
          });
        }
      });

      return await this.getConfig(tenantId);
    } catch (error) {
      throw error;
    }
  }

  async autoAssign(tenantId, conversationId) {
    try {
      if (!tenantId || !conversationId) return null;

      const selectedVendor = await prisma.$transaction(async (tx) => {
        const conversation = await tx.conversation.findFirst({
          where: { id: conversationId, tenantId }
        });
        
        if (!conversation || conversation.status !== 'PENDING_ASSIGNMENT') {
          return null;
        }

        const rule = await tx.assignmentRule.findUnique({
          where: { tenantId }
        });

        if (!rule || rule.strategy !== 'ROUND_ROBIN') {
          return null;
        }

        let eligibleUsers = await tx.user.findMany({
          where: {
            tenantId,
            eligibleRules: { some: { ruleId: rule.id } }
          },
          include: {
            _count: {
              select: {
                conversations: { where: { status: 'ACTIVE', tenantId } }
              }
            }
          }
        });

        if (eligibleUsers.length === 0) {
          return null;
        }

        eligibleUsers.sort((a, b) => a._count.conversations - b._count.conversations);
        const vendor = eligibleUsers[0];

        const updateResult = await tx.conversation.updateMany({
          where: { id: conversationId, tenantId, status: 'PENDING_ASSIGNMENT' },
          data: {
            vendorId: vendor.id,
            status: 'ACTIVE'
          }
        });

        if (updateResult.count === 0) {
          return null;
        }

        return vendor;
      });

      if (selectedVendor) {
        try {
          const io = getIo();
          io.of('/chat').to(`vendor_${selectedVendor.id}`).emit('chat:assigned', {
            type: 'chat:assigned',
            payload: { conversationId },
            timestamp: new Date().toISOString(),
            correlationId: conversationId
          });
        } catch (socketErr) {
          console.error(`[AssignmentService] Error emitting socket event:`, socketErr);
        }
      }

      return selectedVendor;
    } catch (error) {
      console.error(`[AssignmentService] Error in autoAssign:`, error);
      throw error;
    }
  }
}

module.exports = new AssignmentService();
