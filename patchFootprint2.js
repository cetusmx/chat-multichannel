const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const regex = /const djs = require\('dayjs'\);\s*const timezone = require\('dayjs\/plugin\/timezone'\);\s*const utcPlugin = require\('dayjs\/plugin\/utc'\);\s*if \(!djs\.extend\.utc\) djs\.extend\(utcPlugin\);\s*if \(!djs\.extend\.tz\) djs\.extend\(timezone\);/g;

const replacement = `const djs = require('dayjs');
               const timezone = require('dayjs/plugin/timezone');
               const utcPlugin = require('dayjs/plugin/utc');
               djs.extend(utcPlugin);
               djs.extend(timezone);`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/routes/chat.routes.js', code);
console.log('Fixed footprint formatting timezone 2');
