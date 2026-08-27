const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatList.jsx', 'utf8');

const regex = /Programado\n\s*<\/span>\n\s*\}\)\}\}/g;
const alternative = /Programado[\s\S]*?<\/span>\s*\}\)\}\}/g;

if (code.match(regex)) {
  code = code.replace(regex, `Programado\n                </span>\n              )}`);
  console.log('Fixed syntax in ChatList regex 1');
} else if (code.match(alternative)) {
  code = code.replace(alternative, `Programado\n                </span>\n              )}`);
  console.log('Fixed syntax in ChatList alternative');
}

fs.writeFileSync('frontend/src/features/chat/components/ChatList.jsx', code);
