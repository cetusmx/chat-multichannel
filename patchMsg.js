const fs = require('fs');
const code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');
console.log(code.substring(0, 500));
