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

if (code.includes(oldTextExtraction)) {
  code = code.replace(oldTextExtraction, newTextExtraction);
  console.log('Patched text extraction');
}

// 2. Add the auto-reply
const regex = /\/\/ --- PUSH NOTIFICATION INTEGRATION ---/;
if (code.match(regex)) {
  const insertStr = `if (isAddToCart && addedClave) {
                try {
                  setTimeout(async () => {
                    await this.sendMessage(
                      conversation.id,
                      '¡Excelente! ¿Cuántas piezas vas a requerir de este producto?',
                      null,
                      'SYSTEM'
                    );
                  }, 1500);
                } catch(err) {
                  logger.error('Failed to send auto-reply for cart', err);
                }
              }

              // --- PUSH NOTIFICATION INTEGRATION ---`;
  code = code.replace(regex, insertStr);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Patched interactive logic successfully.');
} else {
  console.log('Could not find push notification block');
}
