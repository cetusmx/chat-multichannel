const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const anchor = `      try {
        const io = socket.getIo();
        io.of('/chat').to(\`conversation:\${conversationId}\`).to(\`tenant_\${req.user.tenantId}_coordinators\`).emit('conversation_updated', updated);
        if (updated.vendorId) {
          io.of('/chat').to(\`vendor_\${updated.vendorId}\`).emit('conversation_updated', updated);
        }
      } catch (socketErr) {`;

const newAnchor = `      try {
        const io = socket.getIo();
        io.of('/chat').to(\`conversation:\${conversationId}\`).to(\`tenant_\${req.user.tenantId}_coordinators\`).emit('conversation_updated', updated);
        if (updated.vendorId) {
          io.of('/chat').to(\`vendor_\${updated.vendorId}\`).emit('conversation_updated', updated);
        }
        
        if (req._footprint) {
          io.of('/chat').to(\`conversation:\${conversationId}\`).to(\`tenant_\${req.user.tenantId}_coordinators\`).emit('new_message', req._footprint);
          if (updated.vendorId) {
            io.of('/chat').to(\`vendor_\${updated.vendorId}\`).emit('new_message', req._footprint);
          }
        }
      } catch (socketErr) {`;

if (code.includes(anchor)) {
  code = code.replace(anchor, newAnchor);
  fs.writeFileSync('backend/src/routes/chat.routes.js', code);
  console.log('Fixed emit new_message footprint');
} else {
  console.log('Emit anchor not found');
}
