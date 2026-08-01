const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const { z } = require('zod');
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');
const { invalidateTenantCache } = require('../utils/tenant-cache.util');

const SALT_ROUNDS = 10;
const VALID_CREATOR_ROLES = ['ADMIN', 'COORDINATOR', 'SUPERADMIN'];

async function enforceQuota(tx, tenantId, newUsersCount = 1) {
  // strict Zod validation for bulk payload array length / sizes
  try { z.number().int().positive().max(10000).parse(newUsersCount); } catch (e) { throw ApiError.badRequest(`Invalid bulk payload size: ${e.errors ? e.errors[0].message : e.message}`); }

  let tenant;
  try {
    const rows = await tx.$queryRaw(Prisma.sql`SELECT id, "max_users" as "maxUsers" FROM "tenants" WHERE id = ${tenantId} FOR UPDATE`);
    if (!rows || rows.length === 0) throw ApiError.notFound('Tenant not found');
    tenant = rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.message && (error.message.includes('timeout') || error.message.includes('deadlock'))) {
      throw ApiError.conflict('System busy, please try again');
    }
    throw ApiError.internal('Database error: ' + error.message);
  }

  if (tenant.maxUsers === -1) return;

  if (tenant.maxUsers === 0) {
    throw ApiError.forbidden('Quota exceeded', 'QUOTA_EXCEEDED');
  }

  const currentCount = await tx.user.count({ where: { tenantId, isActive: true } });
  if (currentCount + newUsersCount > tenant.maxUsers) {
    console.warn(`QUOTA_EXCEEDED_ATTEMPT: tenant ${tenantId} tried to exceed maxUsers of ${tenant.maxUsers}`);
    throw ApiError.forbidden('Quota exceeded', 'QUOTA_EXCEEDED');
  }
}

async function validateCoordinator(tx, coordinatorId, tenantId) {
  if (!coordinatorId) return;
  const coordinator = await tx.user.findFirst({
    where: { id: coordinatorId, tenantId, role: 'COORDINATOR' },
  });
  if (!coordinator) {
    throw ApiError.badRequest('Invalid coordinator: user not found or is not a coordinator');
  }
}

async function validateGroupCoordinatorLimit(tx, groupIds, tenantId, excludeUserId) {
  const where = {
    groupId: { in: groupIds },
    user: { role: 'COORDINATOR', tenantId },
    ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
  };
  const existing = await tx.groupVendor.findMany({
    where,
    include: {
      group: { select: { name: true } },
      user: { select: { name: true } },
    },
  });
  if (existing.length > 0) {
    const details = existing.map(
      (gv) => `"${gv.group.name}" (coordinador: ${gv.user.name})`,
    );
    throw ApiError.badRequest(
      `Los siguientes grupos ya tienen un coordinador asignado: ${details.join(', ')}`,
    );
  }
}

async function resolveGroupCoordinator(tx, groupIds, tenantId) {
  if (!groupIds || groupIds.length === 0) return null;
  const coordGv = await tx.groupVendor.findFirst({
    where: { groupId: groupIds[0], user: { role: 'COORDINATOR', tenantId } },
    select: { userId: true },
  });
  return coordGv ? coordGv.userId : null;
}

async function createUser(data, tenantId, actorRole) {
  if (Array.isArray(data)) {
    return createBulkUsers(data, tenantId, actorRole);
  }

  if (actorRole !== 'SUPERADMIN' && !VALID_CREATOR_ROLES.includes(actorRole)) {
    throw ApiError.forbidden('Insufficient permissions');
  }

  if (typeof data.password !== 'string' || data.password.length < 6) {
    throw ApiError.badRequest('Password must be a string of at least 6 characters');
  }
  if (data.groupIds !== undefined && !Array.isArray(data.groupIds)) {
    throw ApiError.badRequest('groupIds must be an array');
  }

  if (actorRole === 'COORDINATOR' && data.role !== 'VENDOR') {
    throw ApiError.forbidden('Coordinator can only create vendors');
  }

  try {
    return await prisma.$transaction(async (tx) => {
    if (actorRole !== 'SUPERADMIN') {
      await enforceQuota(tx, tenantId, 1);
    }

    const existing = await tx.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw ApiError.conflict('Email already in use');
    }

    if (data.role === 'ADMIN' && data.groupIds && data.groupIds.length > 0) {
      throw ApiError.badRequest('Group assignment is not available for admin users');
    }

    let coordinatorId = null;
    if (data.role === 'VENDOR') {
      if (!data.groupIds || data.groupIds.length === 0) {
        throw ApiError.badRequest('At least one group is required for vendor role');
      }
      if (data.groupIds.length > 1) {
        throw ApiError.badRequest('A vendor can only be assigned to one group');
      }
      coordinatorId = await resolveGroupCoordinator(tx, data.groupIds, tenantId);
    }

    if (data.role === 'COORDINATOR' && data.coordinatorId) {
      await validateCoordinator(tx, data.coordinatorId, tenantId);
      coordinatorId = data.coordinatorId;
    }

    if (data.groupIds && data.groupIds.length > 0) {
      const validGroups = await tx.group.count({
        where: { id: { in: data.groupIds }, branch: { tenantId } },
      });
      if (validGroups !== data.groupIds.length) {
        throw ApiError.badRequest('One or more groups are invalid or belong to another tenant');
      }
    }

    if (data.role === 'COORDINATOR' && data.groupIds && data.groupIds.length > 0) {
      await validateGroupCoordinatorLimit(tx, data.groupIds, tenantId);
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        passwordHash,
        role: data.role,
        tenantId,
        coordinatorId,
        groups: data.groupIds && data.groupIds.length > 0
          ? { create: data.groupIds.map((groupId) => ({ groupId })) }
          : undefined,
      },
      include: {
        groups: { include: { group: { select: { id: true, name: true } } } },
        coordinator: { select: { id: true, name: true, email: true } },
      },
    });

    return formatUser(user);
  });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'P2028' || (error.message && error.message.includes('timeout'))) {
      throw ApiError.conflict('System busy, please try again');
    }
    throw error;
  }
}

async function createBulkUsers(dataArray, tenantId, actorRole) {
  if (actorRole !== 'SUPERADMIN' && !VALID_CREATOR_ROLES.includes(actorRole)) {
    throw ApiError.forbidden('Insufficient permissions');
  }

  const processedData = await Promise.all(dataArray.map(async (data) => {
    if (typeof data.password !== 'string' || data.password.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters');
    }
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    return { ...data, passwordHash };
  }));

  try {
    return await prisma.$transaction(async (tx) => {
      if (actorRole !== 'SUPERADMIN') {
        await enforceQuota(tx, tenantId, processedData.length);
      }

      const emails = processedData.map(d => d.email);
      if (new Set(emails).size !== emails.length) {
        throw ApiError.badRequest('Duplicate emails in payload');
      }

      const existingUsers = await tx.user.findMany({ where: { email: { in: emails } } });
      if (existingUsers.length > 0) {
        throw ApiError.conflict('One or more emails already in use');
      }

      for (const data of processedData) {
        if (data.groupIds && !Array.isArray(data.groupIds)) {
          throw ApiError.badRequest('groupIds must be an array');
        }
        if (data.groupIds && new Set(data.groupIds).size !== data.groupIds.length) {
          throw ApiError.badRequest('Duplicate group IDs in payload');
        }
      }

      const usersToCreate = [];
      const userGroupLinks = [];

      for (const data of processedData) {
        if (actorRole === 'COORDINATOR' && data.role !== 'VENDOR') {
          throw ApiError.forbidden('Coordinator can only create vendors');
        }

        if (data.role === 'ADMIN' && data.groupIds && data.groupIds.length > 0) {
          throw ApiError.badRequest('Group assignment is not available for admin users');
        }

        let coordinatorId = null;
        if (data.role === 'VENDOR') {
          if (!data.groupIds || data.groupIds.length === 0) {
            throw ApiError.badRequest('At least one group is required for vendor role');
          }
          if (data.groupIds.length > 1) {
            throw ApiError.badRequest('A vendor can only be assigned to one group');
          }
          coordinatorId = await resolveGroupCoordinator(tx, data.groupIds, tenantId);
        }

        if (data.role === 'COORDINATOR' && data.coordinatorId) {
          await validateCoordinator(tx, data.coordinatorId, tenantId);
          coordinatorId = data.coordinatorId;
        }

        if (data.groupIds && data.groupIds.length > 0) {
          const validGroups = await tx.group.count({
            where: { id: { in: data.groupIds }, branch: { tenantId } },
          });
          if (validGroups !== data.groupIds.length) {
            throw ApiError.badRequest('One or more groups are invalid or belong to another tenant');
          }
        }
        if (data.role === 'COORDINATOR' && data.groupIds && data.groupIds.length > 0) {
          await validateGroupCoordinatorLimit(tx, data.groupIds, tenantId);
        }

        usersToCreate.push({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          passwordHash: data.passwordHash,
          role: data.role,
          tenantId,
          coordinatorId
        });

        if (data.groupIds && data.groupIds.length > 0) {
          userGroupLinks.push({ email: data.email, groupIds: data.groupIds });
        }
      }

      await tx.user.createMany({ data: usersToCreate });

      const createdUsersList = await tx.user.findMany({
        where: { email: { in: processedData.map(d => d.email) }, tenantId },
      });

      const groupVendorData = [];
      for (const link of userGroupLinks) {
        const user = createdUsersList.find(u => u.email === link.email);
        for (const groupId of link.groupIds) {
          groupVendorData.push({ userId: user.id, groupId });
        }
      }

      if (groupVendorData.length > 0) {
        await tx.groupVendor.createMany({ data: groupVendorData });
      }

      const finalUsers = await tx.user.findMany({
        where: { email: { in: processedData.map(d => d.email) }, tenantId },
        include: {
          groups: { include: { group: { select: { id: true, name: true } } } },
          coordinator: { select: { id: true, name: true, email: true } },
        },
      });

      invalidateTenantCache(tenantId);
      return finalUsers.map(formatUser);
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'P2028' || (error.message && error.message.includes('timeout'))) {
      throw ApiError.conflict('System busy, please try again');
    }
    throw error;
  }
}

async function listUsers(tenantId, filters = {}, actorRole) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = { tenantId };

  if (filters.role === 'COORDINATOR') {
    where.role = 'COORDINATOR';
  } else if (actorRole === 'COORDINATOR') {
    where.role = 'VENDOR';
  } else if (filters.role) {
    where.role = filters.role;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        coordinatorId: true,
        createdAt: true,
        coordinator: { select: { id: true, name: true } },
        groups: { include: { group: { select: { id: true, name: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const mapped = users.map((u) => ({
    ...u,
    groups: u.groups ? u.groups.map((gv) => ({ id: gv.group.id, name: gv.group.name })) : [],
  }));

  return { users: mapped, meta: { total, page, limit } };
}

async function getUserById(id, tenantId) {
  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    include: {
      groups: { include: { group: { select: { id: true, name: true } } } },
      coordinator: { select: { id: true, name: true, email: true } },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const result = formatUser(user);

  if (user.role === 'COORDINATOR') {
    result.vendorCount = await prisma.user.count({
      where: { coordinatorId: user.id, role: 'VENDOR', tenantId },
    });
  }

  return result;
}

function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    tenantId: user.tenantId,
    coordinatorId: user.coordinatorId,
    coordinator: user.coordinator || null,
    groups: user.groups
      ? user.groups.map((gv) => ({ id: gv.group.id, name: gv.group.name }))
      : [],
    createdAt: user.createdAt,
  };
}

async function reactivateUser(id, tenantId, actorRole, actorId) {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { id, tenantId } });
      if (!user) throw ApiError.notFound('User not found');
      
      if (actorRole === 'COORDINATOR' && user.role !== 'VENDOR') {
        throw ApiError.forbidden('Coordinator can only reactivate vendor users');
      }

      if (actorRole === 'COORDINATOR' && actorId) {
        const groupVendor = await tx.groupVendor.findFirst({
          where: { userId: user.id },
          include: { group: true }
        });
        if (!groupVendor) {
          throw ApiError.forbidden('Coordinator cannot reactivate a vendor without a group');
        }
        const isCoordinator = await tx.groupVendor.findFirst({
          where: { groupId: groupVendor.groupId, userId: actorId, user: { role: 'COORDINATOR' } }
        });
        if (!isCoordinator) {
           throw ApiError.forbidden('Coordinator can only reactivate vendors in their own group');
        }
      }

      if (user.isActive) {
        return formatUser(user);
      }

      await enforceQuota(tx, tenantId, 1);

      const updated = await tx.user.update({
        where: { id },
        data: { isActive: true },
        include: {
          groups: { include: { group: { select: { id: true, name: true } } } },
          coordinator: { select: { id: true, name: true, email: true } },
        },
      });
      invalidateTenantCache(tenantId);
      return formatUser(updated);
    }, { timeout: 10000 });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'P2028' || (error.message && error.message.includes('timeout'))) {
      throw ApiError.conflict('System busy, please try again');
    }
    throw error;
  }
}

async function updateUser(id, tenantId, actorRole, data) {
  try {
    return await prisma.$transaction(async (tx) => {
      const users = await tx.$queryRaw`SELECT * FROM "users" WHERE id = ${id} AND "tenant_id" = ${tenantId} FOR UPDATE`;
      const user = users[0];
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (actorRole === 'COORDINATOR' && user.role !== 'VENDOR') {
        throw ApiError.forbidden('Coordinator can only edit vendor users');
      }

      if (actorRole === 'COORDINATOR' && data.role && data.role !== 'VENDOR') {
        throw ApiError.forbidden('Coordinator cannot change role to non-vendor');
      }

      if (data.isActive && !user.isActive) {
        await enforceQuota(tx, tenantId, 1);
      }

      if (data.email && data.email !== user.email) {
        const existing = await tx.user.findUnique({ where: { email: data.email } });
        if (existing) {
          throw ApiError.conflict('Email already in use');
        }
      }

      let coordinatorValue;
      if (user.role === 'VENDOR') {
        if (data.groupIds !== undefined && data.groupIds !== null) {
        if (!Array.isArray(data.groupIds)) {
          throw ApiError.badRequest('groupIds must be an array');
        }
          coordinatorValue = await resolveGroupCoordinator(tx, data.groupIds, tenantId);
        }
      } else if (data.coordinatorId !== undefined) {
        coordinatorValue = data.coordinatorId || null;
        if (coordinatorValue) {
          await validateCoordinator(tx, coordinatorValue, tenantId);
        }
      }

      const updateData = {
        name: data.name !== undefined ? data.name : undefined,
        email: data.email !== undefined ? data.email : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        coordinatorId: coordinatorValue !== undefined ? coordinatorValue : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      };

      if (data.groupIds !== undefined && data.groupIds !== null) {
        if (user.role === 'ADMIN') {
          throw ApiError.badRequest('Group assignment is not available for admin users');
        }

        if (data.groupIds.length === 0) {
          throw ApiError.badRequest('At least one group is required');
        }

        if (user.role === 'VENDOR' && data.groupIds.length > 1) {
          throw ApiError.badRequest('A vendor can only be assigned to one group');
        }

        const validGroups = await tx.group.count({
          where: { id: { in: data.groupIds }, branch: { tenantId } },
        });
        if (validGroups !== data.groupIds.length) {
          throw ApiError.badRequest('One or more groups are invalid or belong to another tenant');
        }

        if (user.role === 'COORDINATOR') {
          await validateGroupCoordinatorLimit(tx, data.groupIds, tenantId, id);
        }
        
        const currentGroups = await tx.groupVendor.findMany({
          where: { userId: id },
          select: { groupId: true },
        });
        const currentGroupIds = currentGroups.map((gv) => gv.groupId);
        const removedGroupIds = currentGroupIds.filter((gid) => !data.groupIds.includes(gid));
        const addedGroupIds = data.groupIds.filter((gid) => !currentGroupIds.includes(gid));

        if (user.role === 'COORDINATOR' && removedGroupIds.length > 0) {
          const groupsWithVendors = await tx.groupVendor.groupBy({
            by: ['groupId'],
            where: {
              groupId: { in: removedGroupIds },
              user: { role: 'VENDOR' },
            },
            _count: { groupId: true },
          });

          if (groupsWithVendors.length > 0) {
            const groupNames = await tx.group.findMany({
              where: { id: { in: groupsWithVendors.map((g) => g.groupId) } },
              select: { name: true },
            });
            throw ApiError.badRequest(
              `Cannot remove groups with active vendors: ${groupNames.map((g) => g.name).join(', ')}`
            );
          }
        }

        if (removedGroupIds.length > 0) {
          await tx.groupVendor.deleteMany({ where: { userId: id, groupId: { in: removedGroupIds } } });
        }

        if (addedGroupIds.length > 0) {
          await tx.groupVendor.createMany({
            data: addedGroupIds.map((groupId) => ({ groupId, userId: id })),
          });
        }
      }

      const updated = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          groups: { include: { group: { select: { id: true, name: true } } } },
          coordinator: { select: { id: true, name: true, email: true } },
        },
      });

      return formatUser(updated);
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'P2028' || (error.message && error.message.includes('timeout'))) {
      throw ApiError.conflict('System busy, please try again');
    }
    throw error;
  }
}

async function registerFcmToken(userId, token) {
  if (!token) throw ApiError.badRequest('Token is required');

  // CRITICAL SECURITY: prevent "Ghost Push" atomically via PostgreSQL array functions
  await prisma.$executeRaw`UPDATE "User" SET fcm_tokens = array_remove(fcm_tokens, ${token}) WHERE ${token} = ANY(fcm_tokens) AND id != ${userId}`;

  // Add to current user if not exists atomically
  await prisma.$executeRaw`UPDATE "User" SET fcm_tokens = array_append(fcm_tokens, ${token}) WHERE id = ${userId} AND NOT (${token} = ANY(fcm_tokens))`;
}

async function removeFcmToken(userId, token) {
  if (!token) throw ApiError.badRequest('Token is required');

  // Remove atomically
  await prisma.$executeRaw`UPDATE "User" SET fcm_tokens = array_remove(fcm_tokens, ${token}) WHERE id = ${userId}`;
}

async function testPushNotification(userId) {
  const pushService = require('./push.service');
  await pushService.sendPushToVendor(userId, {
    notification: { title: 'Test Push', body: 'This is a test notification' },
    android: { priority: 'high', notification: { tag: 'test_chat', sound: 'notification_sound' } },
    apns: { payload: { aps: { 'thread-id': 'test_chat', sound: 'notification_sound.wav' } } },
    data: { chatId: 'test_chat', type: 'test_message' }
  });
}

module.exports = { createUser, listUsers, getUserById, updateUser, reactivateUser, registerFcmToken, removeFcmToken, testPushNotification };
