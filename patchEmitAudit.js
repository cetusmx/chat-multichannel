const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const regex = /ioEvent\.emit\('conversation_updated', updated\);/g;
const replacement = `ioEvent.emit('conversation_updated', updated);
      if (req._footprint) ioEvent.emit('new_message', req._footprint);`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/routes/chat.routes.js', code);
console.log('Fixed emit in chat.routes.js');
