const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const regex = /const conversation = await prisma\.conversation\.findUnique\(\{ where: \{ id: conversationId \} \}\);\s*if \(!conversation \|\| conversation\.tenantId !== req\.user\.tenantId \|\| \(req\.user\.role === 'VENDOR' && conversation\.vendorId !== req\.user\.id\)\) \{\s*return res\.status\(403\)\.json\(\{ error: 'No autorizado' \}\);\s*\}/;

const replacement = `const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.tenantId !== req.user.tenantId || (req.user.role === 'VENDOR' && conversation.vendorId !== req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (isInternal && !conversation.vendorId && ['ADMIN', 'COORDINATOR'].includes(req.user.role)) {
      return res.status(400).json({ error: 'No se pueden enviar susurros en una conversación sin asignar' });
    }`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/routes/chat.routes.js', code);
console.log('Fixed backend route restriction');
