const fs = require('fs');
let content = fs.readFileSync('backend/src/services/users.service.js', 'utf8');

// 1. Unhandled Zod errors in enforceQuota
content = content.replace(/z\.number\(\)\.int\(\)\.positive\(\)\.max\(10000\)\.parse\(newUsersCount\);/, 
  'try { z.number().int().positive().max(10000).parse(newUsersCount); } catch (e) { throw ApiError.badRequest(\'Invalid bulk payload size\'); }');

// 2. Swallowed DB errors in row-level lock & 3. Raw SELECT FOR UPDATE lock not tied to Prisma ORM query
content = content.replace(/try \{\s+await tx\.\$queryRaw\(Prisma\.sql`SELECT id FROM "Tenant" WHERE id = \$\{tenantId\}::uuid FOR UPDATE`\);\s+\} catch \(error\) \{\s+throw ApiError\.conflict\('System busy, please try again'\);\s+\}\s+const tenant = await tx\.tenant\.findUnique\(\{ where: \{ id: tenantId \} \}\);\s+if \(\!tenant\) throw ApiError\.notFound\('Tenant not found'\);/, 
  `let tenant;
  try {
    const rows = await tx.$queryRaw(Prisma.sql\`SELECT id, "maxUsers" FROM "Tenant" WHERE id = \${tenantId}::uuid FOR UPDATE\`);
    if (!rows || rows.length === 0) throw ApiError.notFound('Tenant not found');
    tenant = rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.message && error.message.includes('uuid')) throw ApiError.badRequest('Invalid tenant ID format');
    throw ApiError.conflict('System busy, please try again');
  }`);

// 4. & 5. createBulkUsers N+1 & Sync bcrypt
const createBulkUsersRegex = /async function createBulkUsers[\s\S]*?\}, \{ timeout: 10000 \}\);\n\}/;
const newCreateBulkUsers = `async function createBulkUsers(dataArray, tenantId, actorRole) {
  if (!VALID_CREATOR_ROLES.includes(actorRole)) {
    throw ApiError.forbidden('Insufficient permissions');
  }

  const processedData = await Promise.all(dataArray.map(async (data) => {
    if (!data.password || data.password.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters');
    }
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    return { ...data, passwordHash };
  }));

  try {
    return await prisma.$transaction(async (tx) => {
      await enforceQuota(tx, tenantId, processedData.length);

      const emails = processedData.map(d => d.email);
      const existingUsers = await tx.user.findMany({ where: { email: { in: emails } } });
      if (existingUsers.length > 0) {
        throw ApiError.conflict('One or more emails already in use');
      }

      const createdUsers = [];
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

        const user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            passwordHash: data.passwordHash,
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
        createdUsers.push(formatUser(user));
      }
      return createdUsers;
    }, { timeout: 10000 });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'P2028' || (error.message && error.message.includes('timeout'))) {
      throw ApiError.conflict('System busy, please try again');
    }
    throw error;
  }
}`;
content = content.replace(createBulkUsersRegex, newCreateBulkUsers);

content = content.replace(/return await prisma\.\$transaction\(async \(tx\) => \{([\s\S]*?)\}, \{ timeout: 10000 \}\);/, 
  `try {
    return await prisma.$transaction(async (tx) => {$1}, { timeout: 10000 });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'P2028' || (error.message && error.message.includes('timeout'))) {
      throw ApiError.conflict('System busy, please try again');
    }
    throw error;
  }`);

content = content.replace(/let coordinatorId = null;/, 
  `if (data.role === 'ADMIN' && data.groupIds && data.groupIds.length > 0) {
      throw ApiError.badRequest('Group assignment is not available for admin users');
    }

    let coordinatorId = null;`);

const reactivateUserRegex = /async function reactivateUser\(id, tenantId, actorRole\) \{[\s\S]*?\}, \{ timeout: 10000 \}\);\n\}/;
const newReactivateUser = `async function reactivateUser(id, tenantId, actorRole) {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { id, tenantId } });
      if (!user) throw ApiError.notFound('User not found');
      
      if (actorRole === 'COORDINATOR' && user.role !== 'VENDOR') {
        throw ApiError.forbidden('Coordinator can only reactivate vendor users');
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
      return formatUser(updated);
    }, { timeout: 10000 });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'P2028' || (error.message && error.message.includes('timeout'))) {
      throw ApiError.conflict('System busy, please try again');
    }
    throw error;
  }
}`;
content = content.replace(reactivateUserRegex, newReactivateUser);

const updateUserRegex = /async function updateUser\(id, tenantId, actorRole, data\) \{[\s\S]*?\}, \{ timeout: 10000 \}\);\n\}/;
const newUpdateUser = `async function updateUser(id, tenantId, actorRole, data) {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { id, tenantId } });
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (actorRole === 'COORDINATOR' && user.role !== 'VENDOR') {
        throw ApiError.forbidden('Coordinator can only edit vendor users');
      }

      if (actorRole === 'COORDINATOR' && data.role && data.role !== 'VENDOR') {
        throw ApiError.forbidden('Coordinator cannot change role to non-vendor');
      }

      if (data.isActive === true && !user.isActive) {
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
              \`Cannot remove groups with active vendors: \${groupNames.map((g) => g.name).join(', ')}\`
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
    }, { timeout: 10000 });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'P2028' || (error.message && error.message.includes('timeout'))) {
      throw ApiError.conflict('System busy, please try again');
    }
    throw error;
  }
}`;
content = content.replace(updateUserRegex, newUpdateUser);

fs.writeFileSync('backend/src/services/users.service.js', content);
