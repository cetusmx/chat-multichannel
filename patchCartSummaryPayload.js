const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const anchor = `if (type === 'PRODUCT_CARD' && metadata) {`;

const insert = `if (type === 'CART_SUMMARY' && metadata) {
          let itemsText = (metadata.items || []).map(i => \`▫️ \${i.cantidad}x *\${i.clave}*\\n  $\${(i.precio * i.cantidad).toFixed(2)}\`).join('\\n\\n');
          let summaryText = \`*Subtotal:* $\${metadata.subtotal.toFixed(2)}\\n*IVA (16%):* $\${metadata.iva.toFixed(2)}\\n*TOTAL NETO: $\${metadata.total.toFixed(2)}*\`;
          let addressText = metadata.shippingAddress ? \`\\n\\n🚚 *Envío a:*\\n_\${metadata.shippingAddress}_\` : '';
          
          textToSend = \`\${itemsText}\\n\\n\${summaryText}\${addressText}\`;
          
          payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhoneNumber,
            type: 'interactive',
            interactive: {
              type: 'button',
              header: {
                type: 'text',
                text: '🛒 RESUMEN DE COTIZACIÓN'
              },
              body: { text: textToSend },
              footer: { text: 'Validez: 24 horas | Sujeto a existencias' },
              action: {
                buttons: [
                  { type: 'reply', reply: { id: 'CONFIRM_ORDER', title: '✅ Confirmar' } },
                  { type: 'reply', reply: { id: 'MODIFY_ORDER', title: '✏️ Cambiar' } }
                ]
              }
            }
          };
        } else if (type === 'PRODUCT_CARD' && metadata) {`;

if (code.includes(anchor)) {
  code = code.replace(anchor, insert);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Patched CART_SUMMARY payload generation.');
} else {
  console.log('Anchor not found!');
}
