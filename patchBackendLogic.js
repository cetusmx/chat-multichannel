const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const regex = /if \(isInternal && !conversation\.vendorId && \['ADMIN', 'COORDINATOR'\]\.includes\(req\.user\.role\)\)/;
const replacement = `if (isInternal && conversation.status === 'PENDING_ASSIGNMENT' && ['ADMIN', 'COORDINATOR'].includes(req.user.role))`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/routes/chat.routes.js', code);
console.log('Fixed backend chat.routes.js restriction logic');
