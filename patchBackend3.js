const fs = require('fs');
const filepath = 'backend/src/routes/chat.routes.js';
let code = fs.readFileSync(filepath, 'utf8');

const old_snippet = `    if (search) {
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
    }`;

const new_snippet = `    if (search) {
      const searchWords = search.trim().toLowerCase().split(/\\s+/).filter(Boolean);
      conversations.forEach(conv => {
        if (conv.messages && conv.messages.length > 0) {
          const msg = conv.messages[0];
          const content = msg.content || msg.text || '';
          const contentLower = content.toLowerCase();
          
          const idxs = searchWords.map(w => contentLower.indexOf(w)).filter(i => i !== -1).sort((a,b) => a-b);
          if (idxs.length > 0) {
            const idx = idxs[0];
            const start = Math.max(0, idx - 30);
            const end = Math.min(content.length, idx + searchWords[0].length + 50);
            let snippet = content.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < content.length) snippet = snippet + '...';
            msg.searchSnippet = snippet;
            msg.content = snippet; // Free up payload size
          }
        }
      });
    }`;

if (code.includes(old_snippet)) {
    code = code.replace(old_snippet, new_snippet);
    fs.writeFileSync(filepath, code);
    console.log('Patched chat.routes.js snippet logic');
} else {
    console.log('Could not find match for snippet logic');
}
