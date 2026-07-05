const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

async function listBranches(tenantId) {
  const branches = await prisma.branch.findMany({
    where: { tenantId },
    include: { _count: { select: { groups: true } } },
    orderBy: { name: 'asc' },
  });

  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    phone: b.phone,
    groupCount: b._count.groups,
    createdAt: b.createdAt,
  }));
}

async function createBranch(tenantId, data) {
  if (!data.name || data.name.trim().length === 0) {
    throw ApiError.badRequest('Branch name is required');
  }

  const branch = await prisma.branch.create({
    data: {
      name: data.name.trim(),
      address: data.address || null,
      phone: data.phone || null,
      tenantId,
    },
  });

  return branch;
}

async function updateBranch(id, tenantId, data) {
  const branch = await prisma.branch.findFirst({ where: { id, tenantId } });
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  if (data.name !== undefined && data.name.trim().length === 0) {
    throw ApiError.badRequest('Branch name cannot be empty');
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      address: data.address !== undefined ? data.address : undefined,
      phone: data.phone !== undefined ? data.phone : undefined,
    },
  });

  return updated;
}

async function deleteBranch(id, tenantId) {
  const branch = await prisma.branch.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { groups: true } } },
  });

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  if (branch._count.groups > 0) {
    throw ApiError.badRequest(
      `Cannot delete branch "${branch.name}" because it has ${branch._count.groups} active group(s). Remove the groups first.`,
    );
  }

  await prisma.branch.delete({ where: { id } });
}

module.exports = { listBranches, createBranch, updateBranch, deleteBranch };
