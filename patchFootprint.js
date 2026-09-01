const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const regex = /const djs = require\('dayjs'\);\s*textContent = `\[Programado\] Seguimiento para el \$\{djs\(scheduledAt\)\.format\('YYYY-MM-DD HH:mm'\)\}`;/g;

const replacement = `const djs = require('dayjs');
               const timezone = require('dayjs/plugin/timezone');
               const utcPlugin = require('dayjs/plugin/utc');
               if (!djs.extend.utc) djs.extend(utcPlugin);
               if (!djs.extend.tz) djs.extend(timezone);
               
               let tz = 'America/Mexico_City';
               if (conversation.tenant && conversation.tenant.businessHours && conversation.tenant.businessHours.timezone) {
                 tz = conversation.tenant.businessHours.timezone;
               }
               
               textContent = \`[Programado] Seguimiento para el \${djs.utc(scheduledAt).tz(tz).format('YYYY-MM-DD HH:mm')}\`;`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/routes/chat.routes.js', code);
console.log('Fixed footprint formatting timezone');
