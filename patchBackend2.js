const fs = require('fs');
const filepath = 'backend/src/routes/chat.routes.js';
let code = fs.readFileSync(filepath, 'utf8');

const old_res = /res\.json\(\{\s*data: conversations,\s*meta: \{\s*total,\s*page: parseInt\(page\),\s*limit: parseInt\(limit\),\s*totalPages: Math\.ceil\(total \/ parseInt\(limit\)\)\s*\}\s*\}\);/;

const new_res = `    if (search) {
      const searchLower = search.trim().toLowerCase();
      conversations.forEach(conv => {
        if (conv.messages && conv.messages.length > 0) {
          const msg = conv.messages[0];
          const content = msg.content || '';
          const idx = content.toLowerCase().indexOf(searchLower);
          if (idx !== -1) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(content.length, idx + searchLower.length + 40);
            let snippet = content.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < content.length) snippet = snippet + '...';
            msg.searchSnippet = snippet;
            msg.content = snippet; // Free up payload size
          }
        }
      });
    }

    res.json({
      data: conversations,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });`;

if (old_res.test(code)) {
    code = code.replace(old_res, new_res);
    fs.writeFileSync(filepath, code);
    console.log('Patched chat.routes.js');
} else {
    console.log('Could not find match in chat.routes.js');
}
