const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const anchor = `await tx.conversation.update({
          where: { id: conversationId },
          data: dataToUpdate
        });

        if (conversation.status !== status) {`;

const fullReplacement = `await tx.conversation.update({
          where: { id: conversationId },
          data: dataToUpdate
        });

        if (conversation.status !== status) {
          let textContent = \`[Estado cambiado a \${status}]\`;
          if (status === 'ON_HOLD') {
             textContent = \`[Pausado - On Hold] Motivo: \${reason.trim()} | Expira en \${timebombHours} horas\`;
          } else if (status === 'SCHEDULED') {
             const djs = require('dayjs');
             textContent = \`[Programado] Seguimiento para el \${djs(scheduledAt).format('YYYY-MM-DD HH:mm')}\`;
          } else if (status === 'WAITING_CUSTOMER') {
             textContent = \`[Esperando al Cliente]\`;
          } else if (status === 'ACTIVE') {
             textContent = \`[Activo] Conversación reactivada por el vendedor\`;
          }

          const footprint = await tx.message.create({
            data: {
              conversationId: conversation.id,
              content: textContent,
              senderType: 'SYSTEM',
              status: 'SENT',
              isInternal: true,
              type: 'TEXT'
            }
          });
          
          // Attach footprint to request for emitting later
          req._footprint = footprint;
        }`;

if (code.includes(anchor)) {
  const regexToReplace = /await tx\.conversation\.update\(\{\s*where: \{ id: conversationId \},\s*data: dataToUpdate\s*\}\);\s*if \(conversation\.status !== status\) \{[\s\S]*?\}\s*\}\);/g;
  const theRest = `}
      });`;
  code = code.replace(regexToReplace, fullReplacement + '\n' + theRest);
  fs.writeFileSync('backend/src/routes/chat.routes.js', code);
  console.log('Fixed footprints with req._footprint');
} else {
  console.log('Not found');
}
