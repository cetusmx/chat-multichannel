const fs = require('fs');
const filepath = 'backend/src/services/users.service.js';
let code = fs.readFileSync(filepath, 'utf8');

const raw_query_old = /const users = await tx\.\$queryRaw`SELECT \* FROM "users" WHERE id = \$\{id\} AND "tenant_id" = \$\{tenantId\} FOR UPDATE`;\s*const user = users\[0\];\s*if \(!user\) \{\s*throw ApiError\.notFound\('User not found'\);\s*\}/m;

const raw_query_new = `const users = await tx.$queryRaw\`SELECT * FROM "users" WHERE id = \${id} AND "tenant_id" = \${tenantId} FOR UPDATE\`;
      const user = users[0];
      if (!user) {
        throw ApiError.notFound('User not found');
      }
      // Map raw postgres columns to prisma model properties
      user.isActive = user.is_active;
      user.tenantId = user.tenant_id;
      user.coordinatorId = user.coordinator_id;
      user.role = user.role;`;

if (raw_query_old.test(code)) {
    code = code.replace(raw_query_old, raw_query_new);
    fs.writeFileSync(filepath, code);
    console.log('Patched raw query in updateUser.');
} else {
    console.log('Could not find match for raw query in updateUser.');
}
