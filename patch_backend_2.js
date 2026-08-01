const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'backend', 'src', 'services', 'users.service.js');
let serviceCode = fs.readFileSync(servicePath, 'utf8');

// Find the start of createBulkUsers
const match = serviceCode.match(/async function createBulkUsers\\([^)]+\\)\\s*{[\\s\\S]*?return createdUsers;\\s*}\\s*\\);\\s*} catch \\(error\\) {[\\s\\S]*?throw error;\\s*}\\s*}/);
if (!match) {
  console.log('Could not find createBulkUsers');
  process.exit(1);
}

const replacement = \`async function createBulkUsers(dataArray, tenantId, actorRole) {
  if (actorRole !== 'SUPERADMIN' && !VALID_CREATOR_ROLES.includes(actorRole)) {
    throw ApiError.forbidden('Insufficient permissions');
  }

  const processedData = await Promise.all(dataArray.map(async (data) => {
    if (typeof data.password !== 'string' || data.password.length < 6) {
      throw ApiError.badRequest('Password must be a string of at least 6 characters');
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

      let groupIdsToValidate = new Set();
      let coordinatorIdsToValidate = new Set();
      let vendorsWithGroups = [];

      for (const data of processedData) {
        if (actorRole === 'COORDINATOR' && data.role !== 'VENDOR') {
          throw ApiError.forbidden('Coordinator can only create vendors');
        }
        if (data.role === 'ADMIN' && data.groupIds && data.groupIds.length > 0) {
          throw ApiError.badRequest('Group assignment is not available for admin users');
        }
        if (data.role === 'VENDOR') {
          if (!data.groupIds || data.groupIds.length === 0) {
            throw ApiError.badRequest('At least one group is required for vendor role');
          }
          if (data.groupIds.length > 1) {
            throw ApiError.badRequest('A vendor can only be assigned to one group');
          }
          data.groupIds.forEach(id => groupIdsToValidate.add(id));
          vendorsWithGroups.push(data);
        }
        if (data.role === 'COORDINATOR' && data.groupIds && data.groupIds.length > 0) {
           data.groupIds.forEach(id => groupIdsToValidate.add(id));
        }
        if (data.role === 'COORDINATOR' && data.coordinatorId) {
          coordinatorIdsToValidate.add(data.coordinatorId);
        }
      }

      const groupIdsArray = Array.from(groupIdsToValidate);
      if (groupIdsArray.length > 0) {
        const validGroups = await tx.group.count({
          where: { id: { in: groupIdsArray }, branch: { tenantId } },
        });
        if (validGroups !== groupIdsArray.length) {
          throw ApiError.badRequest('One or more groups are invalid or belong to another tenant');
        }
      }

      const coordIdsArray = Array.from(coordinatorIdsToValidate);
      if (coordIdsArray.length > 0) {
        for (const cid of coordIdsArray) {
          await validateCoordinator(tx, cid, tenantId);
        }
      }

      const coordGroupsWithRoleCoordinator = processedData.filter(d => d.role === 'COORDINATOR' && d.groupIds).flatMap(d => d.groupIds);
      if (coordGroupsWithRoleCoordinator.length > 0) {
        await validateGroupCoordinatorLimit(tx, coordGroupsWithRoleCoordinator, tenantId);
      }

      const groupCoordinatorsMap = new Map();
      if (vendorsWithGroups.length > 0) {
        const vendorGroupIds = Array.from(new Set(vendorsWithGroups.flatMap(v => v.groupIds)));
        const coordGvs = await tx.groupVendor.findMany({
          where: { groupId: { in: vendorGroupIds }, user: { role: 'COORDINATOR', tenantId } },
          select: { groupId: true, userId: true },
        });
        coordGvs.forEach(cv => groupCoordinatorsMap.set(cv.groupId, cv.userId));
      }

      const usersToInsert = processedData.map(data => {
        let coordinatorId = null;
        if (data.role === 'VENDOR') {
          coordinatorId = groupCoordinatorsMap.get(data.groupIds[0]) || null;
        } else if (data.role === 'COORDINATOR' && data.coordinatorId) {
          coordinatorId = data.coordinatorId;
        }
        
        return {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          passwordHash: data.passwordHash,
          role: data.role,
          tenantId,
          coordinatorId,
        };
      });

      const insertedUsers = await tx.user.createManyAndReturn({
        data: usersToInsert,
      });

      const groupVendorsToInsert = [];
      insertedUsers.forEach((user) => {
        const originalData = processedData.find(d => d.email === user.email);
        if (originalData && originalData.groupIds && originalData.groupIds.length > 0) {
          originalData.groupIds.forEach(groupId => {
            groupVendorsToInsert.push({
              userId: user.id,
              groupId: groupId
            });
          });
        }
      });

      if (groupVendorsToInsert.length > 0) {
        await tx.groupVendor.createMany({
          data: groupVendorsToInsert
        });
      }

      const finalUsers = await tx.user.findMany({
        where: { id: { in: insertedUsers.map(u => u.id) } },
        include: {
          groups: { include: { group: { select: { id: true, name: true } } } },
          coordinator: { select: { id: true, name: true, email: true } },
        }
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
}\`;

serviceCode = serviceCode.replace(match[0], replacement);

fs.writeFileSync(servicePath, serviceCode);
console.log('Replaced createBulkUsers with batch mode successfully.');
