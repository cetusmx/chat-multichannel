const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const regex = /slaPausedMins: \{ increment: Math\.max\(0, pausedBusinessMins\) \}/;
const replacement = `slaPausedMins: { increment: Math.floor(Math.max(0, pausedBusinessMins)) }`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
console.log('Fixed whatsapp.service.js SLA increment');
