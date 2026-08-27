const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const target = `                    unreadCount: { increment: 1 }
                  }
                });`;

const replacement = `                    unreadCount: { increment: 1 }
                  }
                });

                const footprint = await prisma.message.create({
                  data: {
                    conversationId: conversation.id,
                    content: '[Activo] Conversación reactivada por mensaje del cliente',
                    senderType: 'SYSTEM',
                    status: 'SENT',
                    isInternal: true,
                    type: 'TEXT'
                  }
                });
                // Attach footprint for emitting
                conversation._footprint = footprint;`;

code = code.replace(target, replacement);
fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
console.log('Fixed auto-resume footprint via string replace');
