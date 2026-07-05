const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

const SALT_ROUNDS = 10;
const VALID_CREATOR_ROLES = ['ADMIN', 'COORDINATOR'];

async function validateCoordinator(coordinatorId, tenantId) {
  if (!coordinatorId) return;
  const coordinator = await prisma.user.findFirst({
    where: { id: coordinatorId, tenantId, role: 'COORDINATOR' },
  });
  if (!coordinator) {
    throw ApiError.badRequest('Invalid coordinator: user not found or is not a coordinator');
  }
}

async function validateGroupCoordinatorLimit(groupIds, tenantId, excludeUserId) {
  const where = {
    groupId: { in: groupIds },
    user: { role: 'COORDINATOR', tenantId },
    ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
  };
  const existing = await prisma.groupVendor.findMany({
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

async function resolveGroupCoordinator(groupIds, tenantId) {
  if (!groupIds || groupIds.length === 0) return null;
  const coordGv = await prisma.groupVendor.findFirst({
    where: { groupId: groupIds[0], user: { role: 'COORDINATOR', tenantId } },
    select: { userId: true },
  });
  return coordGv ? coordGv.userId : null;
}

async function createUser(data, tenantId, actorRole) {
  if (!VALID_CREATOR_ROLES.includes(actorRole)) {
    throw ApiError.forbidden('Insufficient permissions');
  }

  if (!data.password || data.password.length < 6) {
    throw ApiError.badRequest('Password must be at least 6 characters');
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw ApiError.conflict('Email already in use');
  }

  if (actorRole === 'COORDINATOR' && data.role !== 'VENDOR') {
    throw ApiError.forbidden('Coordinator can only create vendors');
  }

  let coordinatorId = null;
  if (data.role === 'VENDOR') {
    if (!data.groupIds || data.groupIds.length === 0) {
      throw ApiError.badRequest('At least one group is required for vendor role');
    }
    if (data.groupIds.length > 1) {
      throw ApiError.badRequest('A vendor can only be assigned to one group');
    }
    coordinatorId = await resolveGroupCoordinator(data.groupIds, tenantId);
  }

  if (data.role === 'COORDINATOR' && data.coordinatorId) {
    await validateCoordinator(data.coordinatorId, tenantId);
    coordinatorId = data.coordinatorId;
  }

  if (data.groupIds && data.groupIds.length > 0) {
    const validGroups = await prisma.group.count({
      where: { id: { in: data.groupIds }, branch: { tenantId } },
    });
    if (validGroups !== data.groupIds.length) {
      throw ApiError.badRequest('One or more groups are invalid or belong to another tenant');
    }
  }

  if (data.role === 'COORDINATOR' && data.groupIds && data.groupIds.length > 0) {
    await validateGroupCoordinatorLimit(data.groupIds, tenantId);
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
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

async function updateUser(id, tenantId, actorRole, data) {
  const user = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (actorRole === 'COORDINATOR' && user.role !== 'VENDOR') {
    throw ApiError.forbidden('Coordinator can only edit vendor users');
  }

  if (actorRole === 'COORDINATOR' && data.role && data.role !== 'VENDOR') {
    throw ApiError.forbidden('Coordinator cannot change role to non-vendor');
  }

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw ApiError.conflict('Email already in use');
    }
  }

  let coordinatorValue;
  if (user.role === 'VENDOR') {
    if (data.groupIds !== undefined) {
      coordinatorValue = await resolveGroupCoordinator(data.groupIds, tenantId);
    }
  } else if (data.coordinatorId !== undefined) {
    coordinatorValue = data.coordinatorId || null;
    if (coordinatorValue) {
      await validateCoordinator(coordinatorValue, tenantId);
    }
  }

  const updateData = {
    name: data.name !== undefined ? data.name : undefined,
    email: data.email !== undefined ? data.email : undefined,
    phone: data.phone !== undefined ? data.phone : undefined,
    coordinatorId: coordinatorValue !== undefined ? coordinatorValue : undefined,
  };

  if (data.groupIds !== undefined) {
    if (user.role === 'ADMIN') {
      throw ApiError.badRequest('Group assignment is not available for admin users');
    }

    if (data.groupIds.length === 0) {
      throw ApiError.badRequest('At least one group is required');
    }

    if (user.role === 'VENDOR' && data.groupIds.length > 1) {
      throw ApiError.badRequest('A vendor can only be assigned to one group');
    }

    const validGroups = await prisma.group.count({
      where: { id: { in: data.groupIds }, branch: { tenantId } },
    });
    if (validGroups !== data.groupIds.length) {
      throw ApiError.badRequest('One or more groups are invalid or belong to another tenant');
    }

    if (user.role === 'COORDINATOR') {
      await validateGroupCoordinatorLimit(data.groupIds, tenantId, id);
      const currentGroups = await prisma.groupVendor.findMany({
        where: { userId: id },
        select: { groupId: true },
      });
      const removedGroupIds = currentGroups
        .map((gv) => gv.groupId)
        .filter((gid) => !data.groupIds.includes(gid));

      if (removedGroupIds.length > 0) {
        const groupsWithVendors = await prisma.groupVendor.groupBy({
          by: ['groupId'],
          where: {
            groupId: { in: removedGroupIds },
            user: { role: 'VENDOR' },
          },
          _count: { groupId: true },
        });

        if (groupsWithVendors.length > 0) {
          const groupNames = await prisma.group.findMany({
            where: { id: { in: groupsWithVendors.map((g) => g.groupId) } },
            select: { name: true },
          });
          throw ApiError.badRequest(
            `Cannot remove groups with active vendors: ${groupNames.map((g) => g.name).join(', ')}`,
          );
        }
      }
    }

    await prisma.groupVendor.deleteMany({ where: { userId: id } });

    if (data.groupIds.length > 0) {
      await prisma.groupVendor.createMany({
        data: data.groupIds.map((groupId) => ({ groupId, userId: id })),
      });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      groups: { include: { group: { select: { id: true, name: true } } } },
      coordinator: { select: { id: true, name: true, email: true } },
    },
  });

  return formatUser(updated);
}

module.exports = { createUser, listUsers, getUserById, updateUser };
