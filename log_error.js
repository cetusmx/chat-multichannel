const fs = require('fs');
let content = fs.readFileSync('backend/src/services/users.service.js', 'utf8');

content = content.replace(/} catch \(error\) \{\s*if \(error instanceof ApiError\) throw error;\s*if \(error\.message && error\.message\.includes\('uuid'\)\) throw ApiError\.badRequest\('Invalid tenant ID format'\);\s*throw ApiError\.conflict\('System busy, please try again'\);\s*\}/,
  '} catch (error) { console.error("LOCK ERROR:", error); if (error instanceof ApiError) throw error; if (error.message && error.message.includes(\\'uuid\\')) throw ApiError.badRequest(\\'Invalid tenant ID format\\'); throw ApiError.conflict(\\'System busy, please try again\\'); }');

fs.writeFileSync('backend/src/services/users.service.js', content);
