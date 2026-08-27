const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const regex = /await prisma\.conversation\.update\(\{\s*where: \{ id: conversationId \},\s*data: \{ lastMessageAt: new Date\(\) \}\s*\}\);/g;
const replacement = `await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), unreadCount: 0 }
      });
      // Also emit chat:read so UI clears badges
      try {
        const io = socket.getIo();
        io.of('/chat').to(\`tenant_\${conversation.tenantId}_coordinators\`).emit('chat:read', { conversationId });
      } catch (err) {}`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/routes/chat.routes.js', code);
console.log('Fixed POST messages reset unreadCount');
