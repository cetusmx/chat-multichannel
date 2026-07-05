const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

async function listGroups(tenantId) {
  const groups = await prisma.group.findMany({
    where: { branch: { tenantId } },
    include: {
      branch: { select: { id: true, name: true } },
      vendors: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  return groups.map((g) => {
    const vendors = g.vendors.filter((gv) => gv.user.role === 'VENDOR');
    const coordinator = g.vendors.find((gv) => gv.user.role === 'COORDINATOR');
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      branchId: g.branchId,
      branch: g.branch,
      vendorCount: vendors.length,
      coordinator: coordinator ? { id: coordinator.user.id, name: coordinator.user.name } : null,
      createdAt: g.createdAt,
    };
  });
}

async function createGroup(tenantId, data) {
  if (!data.name || data.name.trim().length === 0) {
    throw ApiError.badRequest('Group name is required');
  }

  if (!data.branchId) {
    throw ApiError.badRequest('Branch ID is required');
  }

  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, tenantId },
  });

  if (!branch) {
    throw ApiError.notFound('Branch not found or does not belong to your tenant');
  }

  const group = await prisma.group.create({
    data: {
      name: data.name.trim(),
      description: data.description || null,
      branchId: data.branchId,
    },
    include: { branch: { select: { id: true, name: true } } },
  });

  return group;
}

async function updateGroup(id, tenantId, data) {
  const group = await prisma.group.findFirst({
    where: { id, branch: { tenantId } },
  });

  if (!group) {
    throw ApiError.notFound('Group not found');
  }

  if (data.name !== undefined && data.name.trim().length === 0) {
    throw ApiError.badRequest('Group name cannot be empty');
  }

  if (data.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, tenantId },
    });
    if (!branch) {
      throw ApiError.notFound('Branch not found or does not belong to your tenant');
    }
  }

  const updated = await prisma.group.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      description: data.description !== undefined ? data.description : undefined,
      branchId: data.branchId !== undefined ? data.branchId : undefined,
    },
    include: { branch: { select: { id: true, name: true } } },
  });

  return updated;
}

async function deleteGroup(id, tenantId) {
  const group = await prisma.group.findFirst({
    where: { id, branch: { tenantId } },
    include: { _count: { select: { vendors: true } } },
  });

  if (!group) {
    throw ApiError.notFound('Group not found');
  }

  if (group._count.vendors > 0) {
    throw ApiError.badRequest(
      `Cannot delete group "${group.name}": it has ${group._count.vendors} user(s) assigned. Remove all assignments before deleting.`,
    );
  }

  await prisma.group.delete({ where: { id } });
}

module.exports = { listGroups, createGroup, updateGroup, deleteGroup };
