const fs = require('fs');
let content = fs.readFileSync('backend/src/services/users.service.test.js', 'utf8');

content = content.replace(/prisma\.tenant\.findUnique\.mockResolvedValue\(\{ maxUsers: (.*?) \}\);/g, 
  "prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: $1 }]);");

fs.writeFileSync('backend/src/services/users.service.test.js', content);
