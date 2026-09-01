const fs = require('fs');
let code = fs.readFileSync('backend/src/workers/sla-cron.js', 'utf8');

code = code.replace(/cron\.schedule\('\*\/5 \* \* \* \*', runSlaCleanup\);/g, "cron.schedule('0 * * * *', runSlaCleanup);");
code = code.replace(/console\.log\('\[SLA-CRON\] Worker scheduled: \*\/5 \* \* \* \*'\);/g, "console.log('[SLA-CRON] Worker scheduled: 0 * * * *');");

fs.writeFileSync('backend/src/workers/sla-cron.js', code);
console.log('Reverted cron schedule');
