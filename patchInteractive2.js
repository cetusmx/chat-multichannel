const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

// 1. Detect interactive message in text extraction
const oldTextExtraction = `              let text = '';
              let mediaData = null;
              if (message.type === 'text') {
                text = message.text.body;
              } else if (['image', 'document', 'audio', 'video'].includes(message.type)) {`;

const newTextExtraction = `              let text = '';
              let mediaData = null;
              let isAddToCart = false;
              let addedClave = null;
              
              if (message.type === 'text') {
                text = message.text.body;
              } else if (message.type === 'interactive') {
                const reply = message.interactive.button_reply || message.interactive.list_reply;
                if (reply) {
                  text = reply.title;
                  if (reply.id && reply.id.startsWith('ADD_CART_')) {
                    isAddToCart = true;
                    addedClave = reply.id.replace('ADD_CART_', '');
                    text = \`> [Botón]: "\${reply.title}" (Clave: \${addedClave})\`;
                  } else {
                    text = \`> [Botón]: "\${reply.title}"\`;
                  }
                }
              } else if (['image', 'document', 'audio', 'video'].includes(message.type)) {`;

code = code.replace(oldTextExtraction, newTextExtraction);

// 2. Add the auto-reply after socket emit inside handleIncomingMessage
const searchStr = `              // --- PUSH NOTIFICATION INTEGRATION ---`;
              
if (code.includes(searchStr)) {
  const insertStr = `              if (isAddToCart && addedClave) {
                try {
                  setTimeout(async () => {
                    // Send an automated response to ask for quantity
                    await this.sendMessage(
                      conversation.id,
                      '¡Excelente! ¿Cuántas piezas vas a requerir de este producto?',
                      null,
                      'SYSTEM'
                    );
                  }, 1500); // Small 1.5s delay to feel natural
                } catch(err) {
                  logger.error('Failed to send auto-reply for cart', err);
                }
              }

              // --- PUSH NOTIFICATION INTEGRATION ---`;
  code = code.replace(searchStr, insertStr);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Patched interactive logic successfully.');
} else {
  console.log('Could not find push notification block');
}
