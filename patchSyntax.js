const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const regex = /req\._footprint = footprint;\s*\}\s*\}\s*\}\);\s*\}\s*\}\);/g;
const replacement = `req._footprint = footprint;
        }
      });`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/routes/chat.routes.js', code);
console.log('Fixed syntax error in chat.routes.js');
