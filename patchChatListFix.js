const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatList.jsx', 'utf8');

const regex = /Programado\s*<\/span>\s*\}\)\}\}/g;
const replacement = `Programado
                </span>
              )}`;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/src/features/chat/components/ChatList.jsx', code);
console.log('Fixed syntax in ChatList');
