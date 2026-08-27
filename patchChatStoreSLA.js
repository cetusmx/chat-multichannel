const fs = require('fs');
let code = fs.readFileSync('frontend/src/stores/useChatStore.js', 'utf8');

const regex = /else if \(c\.status === 'ACTIVE' && slaConfig\.resolutionMins\) \{\s*const start = c\.createdAt;\s*const elapsedMins = \(now - new Date\(start\)\.getTime\(\)\) \/ 60000;\s*if \(elapsedMins > slaConfig\.resolutionMins\) \{/g;
const replacement = `else if (c.status === 'ACTIVE' && slaConfig.resolutionMins) {
          const start = c.createdAt;
          const rawElapsedMins = (now - new Date(start).getTime()) / 60000;
          const elapsedMins = Math.max(0, rawElapsedMins - (c.slaPausedMins || 0));
          if (elapsedMins > slaConfig.resolutionMins) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/src/stores/useChatStore.js', code);
console.log('Fixed SLA calculation in useChatStore');
