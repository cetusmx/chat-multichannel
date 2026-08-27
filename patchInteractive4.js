const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const regex = /let text = '';\s*let mediaData = null;\s*if \(message\.type === 'text'\) \{/m;

const newTextExtraction = `let text = '';
              let mediaData = null;
              let isAddToCart = false;
              let addedClave = null;
              
              if (message.type === 'interactive') {
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
              } else if (message.type === 'text') {`;

if (code.match(regex)) {
  code = code.replace(regex, newTextExtraction);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Patched text extraction');
}
