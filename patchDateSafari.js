const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', 'utf8');

const regex = /scheduledAt: new Date\(scheduledAt\)\.toISOString\(\),/g;
const replacement = `scheduledAt: (() => {
          const [year, month, day, hour, minute] = scheduledAt.split(/[-T:]/).map(Number);
          return new Date(year, month - 1, day, hour, minute).toISOString();
        })(),`;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', code);
console.log('Fixed Safari Date parsing bug');
