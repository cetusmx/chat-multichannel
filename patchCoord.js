const fs = require('fs');
const filepath = 'backend/src/services/users.service.js';
let code = fs.readFileSync(filepath, 'utf8');

// Patch 1: validateCoordinator
const p1_old = /where: \{ id: coordinatorId, tenantId, role: 'COORDINATOR' \},/;
const p1_new = "where: { id: coordinatorId, tenantId, role: 'COORDINATOR', isActive: true },";
code = code.replace(p1_old, p1_new);

// Patch 2: validateGroupCoordinatorLimit
const p2_old = /user: \{ role: 'COORDINATOR', tenantId \},/;
const p2_new = "user: { role: 'COORDINATOR', tenantId, isActive: true },";
code = code.replace(p2_old, p2_new);

// Patch 3: resolveGroupCoordinator
const p3_old = /where: \{ groupId: groupIds\[0\], user: \{ role: 'COORDINATOR', tenantId \} \},/;
const p3_new = "where: { groupId: groupIds[0], user: { role: 'COORDINATOR', tenantId, isActive: true } },";
code = code.replace(p3_old, p3_new);

fs.writeFileSync(filepath, code);
console.log('Patched coordinator validations to ignore inactive users.');
