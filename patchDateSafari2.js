const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', 'utf8');

const regex = /const selectedDate = new Date\(scheduledAt\);/g;
const replacement = `const [year, month, day, hour, minute] = scheduledAt.split(/[-T:]/).map(Number);
      const selectedDate = new Date(year, month - 1, day, hour, minute);`;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', code);
console.log('Fixed second Safari Date parsing bug');
