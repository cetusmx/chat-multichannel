const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const regex = /dataToUpdate\.slaPausedMins = \{ increment: Math\.max\(0, pausedMins\) \};/;
const replacement = `dataToUpdate.slaPausedMins = { increment: Math.floor(Math.max(0, pausedMins)) };`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/routes/chat.routes.js', code);
console.log('Fixed chat.routes.js SLA increment');
