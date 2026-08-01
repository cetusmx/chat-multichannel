const fs = require('fs');
let content = fs.readFileSync('backend/src/services/users.service.js', 'utf8');

content = content.replace(/SELECT id, "maxUsers" FROM "Tenant" WHERE id = \$\{tenantId\}::uuid FOR UPDATE/, 
  'SELECT id, "max_users" as "maxUsers" FROM "Tenant" WHERE id = ${tenantId}::uuid FOR UPDATE');

fs.writeFileSync('backend/src/services/users.service.js', content);
