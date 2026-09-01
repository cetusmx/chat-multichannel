const fs = require('fs');
let code = fs.readFileSync('backend/src/workers/sla-cron.js', 'utf8');

const regex = /cron\.schedule\('0 \* \* \* \*', runSlaCleanup\);/g;
const replacement = `cron.schedule('*/5 * * * *', runSlaCleanup);`;
code = code.replace(regex, replacement);

const regex2 = /console\.log\('\[SLA-CRON\] Worker scheduled: 0 \* \* \* \*'\);/g;
const replacement2 = `console.log('[SLA-CRON] Worker scheduled: */5 * * * *');`;
code = code.replace(regex2, replacement2);

fs.writeFileSync('backend/src/workers/sla-cron.js', code);
console.log('Fixed SLA cron frequency');
