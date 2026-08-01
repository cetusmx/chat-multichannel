const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'backend', 'src', 'services', 'users.service.js');
let serviceCode = fs.readFileSync(servicePath, 'utf8');

// 1. Global Superadmin bypass
serviceCode = serviceCode.replace(
  `const VALID_CREATOR_ROLES = ['ADMIN', 'COORDINATOR'];`,
  `const VALID_CREATOR_ROLES = ['ADMIN', 'COORDINATOR', 'SUPERADMIN'];`
);

serviceCode = serviceCode.replace(
  `  if (!VALID_CREATOR_ROLES.includes(actorRole)) {`,
  `  if (actorRole !== 'SUPERADMIN' && !VALID_CREATOR_ROLES.includes(actorRole)) {`
);
// replace second occurrence in createBulkUsers as well
serviceCode = serviceCode.replace(
  `  if (!VALID_CREATOR_ROLES.includes(actorRole)) {`,
  `  if (actorRole !== 'SUPERADMIN' && !VALID_CREATOR_ROLES.includes(actorRole)) {`
);

serviceCode = serviceCode.replace(
  `    await enforceQuota(tx, tenantId, 1);`,
  `    if (actorRole !== 'SUPERADMIN') {
      await enforceQuota(tx, tenantId, 1);
    }`
);
serviceCode = serviceCode.replace(
  `      await enforceQuota(tx, tenantId, processedData.length);`,
  `      if (actorRole !== 'SUPERADMIN') {
        await enforceQuota(tx, tenantId, processedData.length);
      }`
);

// 2. Race Condition in updateUser
serviceCode = serviceCode.replace(
  `      const user = await tx.user.findFirst({ where: { id, tenantId } });
      if (!user) {
        throw ApiError.notFound('User not found');
      }`,
  `      const users = await tx.$queryRaw\`SELECT * FROM "User" WHERE id = \${id} AND "tenantId" = \${tenantId} FOR UPDATE\`;
      const user = users[0];
      if (!user) {
        throw ApiError.notFound('User not found');
      }`
);

// 3. Missing ::uuid cast
serviceCode = serviceCode.replace(
  `SELECT id, "max_users" as "maxUsers" FROM "tenants" WHERE id = \${tenantId} FOR UPDATE`,
  `SELECT id, "max_users" as "maxUsers" FROM "tenants" WHERE id = \${tenantId}::uuid FOR UPDATE`
);

// 4. Missing Array check for groupIds and password check
// In createUser
serviceCode = serviceCode.replace(
  `  if (!data.password || data.password.length < 6) {
    throw ApiError.badRequest('Password must be at least 6 characters');
  }`,
  `  if (typeof data.password !== 'string' || data.password.length < 6) {
    throw ApiError.badRequest('Password must be a string of at least 6 characters');
  }
  if (data.groupIds !== undefined && !Array.isArray(data.groupIds)) {
    throw ApiError.badRequest('groupIds must be an array');
  }`
);
// In updateUser
serviceCode = serviceCode.replace(
  `      if (data.groupIds !== undefined && data.groupIds !== null) {`,
  `      if (data.groupIds !== undefined && data.groupIds !== null) {
        if (!Array.isArray(data.groupIds)) {
          throw ApiError.badRequest('groupIds must be an array');
        }`
);

// In createBulkUsers loop validation
serviceCode = serviceCode.replace(
  `    if (!data.password || data.password.length < 6) {`,
  `    if (typeof data.password !== 'string' || data.password.length < 6) {`
);
serviceCode = serviceCode.replace(
  `        if (data.groupIds && new Set(data.groupIds).size !== data.groupIds.length) {`,
  `        if (data.groupIds && !Array.isArray(data.groupIds)) {
          throw ApiError.badRequest('groupIds must be an array');
        }
        if (data.groupIds && new Set(data.groupIds).size !== data.groupIds.length) {`
);

// 5. Tenant cache invalidation
serviceCode = serviceCode.replace(
  `const ApiError = require('../utils/ApiError');`,
  `const ApiError = require('../utils/ApiError');
const { invalidateTenantCache } = require('../utils/tenant-cache.util');`
);

serviceCode = serviceCode.replace(
  `      return createdUsers;`,
  `      invalidateTenantCache(tenantId);
      return createdUsers;`
);

serviceCode = serviceCode.replace(
  `      return formatUser(updated);
    }, { timeout: 10000 });`,
  `      invalidateTenantCache(tenantId);
      return formatUser(updated);
    }, { timeout: 10000 });`
);

// 6. Vendor reactivation bypasses Coordinator validation
serviceCode = serviceCode.replace(
  `        if (groupVendor) {
          const isCoordinator = await tx.groupVendor.findFirst({
            where: { groupId: groupVendor.groupId, userId: actorId, user: { role: 'COORDINATOR' } }
          });
          if (!isCoordinator) {
             throw ApiError.forbidden('Coordinator can only reactivate vendors in their own group');
          }
        }`,
  `        if (!groupVendor) {
          throw ApiError.forbidden('Coordinator cannot reactivate a vendor without a group');
        }
        const isCoordinator = await tx.groupVendor.findFirst({
          where: { groupId: groupVendor.groupId, userId: actorId, user: { role: 'COORDINATOR' } }
        });
        if (!isCoordinator) {
           throw ApiError.forbidden('Coordinator can only reactivate vendors in their own group');
        }`
);

fs.writeFileSync(servicePath, serviceCode);

console.log('Backend fixes applied successfully (except N+1 loop).');
