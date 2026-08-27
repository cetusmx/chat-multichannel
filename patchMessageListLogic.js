const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

const regex = /const isInternalRestricted = !vendorId && \['ADMIN', 'COORDINATOR'\]\.includes\(user\?\.role\);/;
const replacement = `const isInternalRestricted = conversationStatus === 'PENDING_ASSIGNMENT' && ['ADMIN', 'COORDINATOR'].includes(user?.role);`;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
console.log('Fixed MessageList.jsx restriction logic');
