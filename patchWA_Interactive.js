const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const regex = /payload = \{\s*messaging_product: 'whatsapp',\s*recipient_type: 'individual',\s*to: cleanPhoneNumber,\s*type: 'image',\s*image: \{ link: metadata\.imageUrl, caption: textToSend \}\s*\};/m;

const replaceStr = `payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhoneNumber,
              type: 'interactive',
              interactive: {
                type: 'button',
                header: {
                  type: 'image',
                  image: {
                    link: metadata.imageUrl
                  }
                },
                body: {
                  text: textToSend
                },
                action: {
                  buttons: [
                    {
                      type: 'reply',
                      reply: {
                        id: \`ADD_CART_\${metadata.clave}\`,
                        title: 'Me interesa'
                      }
                    }
                  ]
                }
              }
            };`;

if (code.match(regex)) {
  code = code.replace(regex, replaceStr);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Interactive image button patched');
} else {
  console.log('Regex not found');
}
