const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const regex = /payload = \{\s*messaging_product: 'whatsapp',\s*recipient_type: 'individual',\s*to: cleanPhoneNumber,\s*type: 'text',\s*text: \{ preview_url: true, body: textToSend \}\s*\};/m;

const replaceStr = `if (type === 'PRODUCT_CARD') {
            payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhoneNumber,
              type: 'interactive',
              interactive: {
                type: 'button',
                body: { text: textToSend },
                action: {
                  buttons: [
                    { type: 'reply', reply: { id: \`ADD_CART_\${metadata?.clave}\`, title: 'Me interesa' } }
                  ]
                }
              }
            };
          } else {
            payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhoneNumber,
              type: 'text',
              text: { preview_url: true, body: textToSend }
            };
          }`;

if (code.match(regex)) {
  code = code.replace(regex, replaceStr);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Interactive text button patched');
} else {
  console.log('Regex not found');
}
