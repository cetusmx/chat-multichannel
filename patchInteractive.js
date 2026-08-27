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

// 2. Trigger auto response at the end of the loop
const socketBroadcastStr = `              // Notificar al Frontend
              try {
                const io = require('../socket').getIo();
                let eventBuilder = io.of('/chat').to(\`conversation:\${conversation.id}\`).to(\`tenant_\${tenantId}_coordinators\`);
                if (conversation.vendorId) {
                  eventBuilder = eventBuilder.to(\`vendor_\${conversation.vendorId}\`);
                }
                eventBuilder.emit('new_message', msgRecord);
              } catch (socketErr) {
                logger.error('[WHATSAPP_SERVICE] Failed to emit new_message', socketErr);
              }`;

// Wait, I need to find where it notifies the frontend.
const searchStr = `eventBuilder.emit('new_message', msgRecord);
              } catch (socketErr) {
                logger.error('[WHATSAPP_SERVICE] Failed to emit new_message', socketErr);
              }`;
              
if (code.includes(searchStr)) {
  const insertStr = `eventBuilder.emit('new_message', msgRecord);
              } catch (socketErr) {
                logger.error('[WHATSAPP_SERVICE] Failed to emit new_message', socketErr);
              }
              
              if (isAddToCart && addedClave) {
                try {
                  setTimeout(async () => {
                    await this.sendMessage(
                      conversation.id,
                      '¡Excelente! ¿Cuántas piezas vas a requerir de este producto?',
                      null,
                      'SYSTEM'
                    );
                  }, 1500); // Small delay to feel natural
                } catch(err) {
                  logger.error('Failed to send auto-reply for cart', err);
                }
              }`;
  code = code.replace(searchStr, insertStr);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Patched interactive logic successfully.');
} else {
  console.log('Could not find socket emit block');
}
