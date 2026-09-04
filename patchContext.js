const fs = require('fs');
const filepath = 'backend/src/routes/chat.routes.js';
let code = fs.readFileSync(filepath, 'utf8');

const old_snippet = `        if (search) {
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

const new_snippet = `    if (search) {
      const searchWords = search.trim().toLowerCase().split(/\\s+/).filter(Boolean);
      await Promise.all(conversations.map(async (conv) => {
        if (conv.messages && conv.messages.length > 0) {
          const msg = conv.messages[0];
          let content = msg.content || msg.text || '';
          
          const prevMsg = await prisma.message.findFirst({
            where: {
              conversationId: conv.id || conv._id,
              createdAt: { lt: msg.createdAt }
            },
            orderBy: { createdAt: 'desc' }
          });

          if (prevMsg) {
            const prevText = prevMsg.content || prevMsg.text || '';
            content = prevText + ' — ' + content;
          }

          const contentLower = content.toLowerCase();
          const idxs = searchWords.map(w => contentLower.indexOf(w)).filter(i => i !== -1).sort((a,b) => a-b);
          
          if (idxs.length > 0) {
            const idx = idxs[0];
            const start = Math.max(0, idx - 45);
            const end = Math.min(content.length, idx + searchWords[0].length + 60);
            let snippet = content.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < content.length) snippet = snippet + '...';
            msg.searchSnippet = snippet;
            msg.content = snippet;
          } else {
            msg.searchSnippet = content.substring(0, 100) + '...';
            msg.content = msg.searchSnippet;
          }
        }
      }));
    }`;

if (code.includes(old_snippet)) {
    code = code.replace(old_snippet, new_snippet);
    fs.writeFileSync(filepath, code);
    console.log('Patched snippet context logic.');
} else {
    console.log('Could not find match for snippet context logic.');
}
