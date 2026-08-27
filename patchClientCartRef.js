const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const buggyStr = `if (typeof client.cart === 'string') {
                              try { currentCart = JSON.parse(client.cart || '[]'); } catch(e){}
                            } else if (Array.isArray(client.cart)) {
                              currentCart = client.cart;
                            } else if (client.cart && client.cart.items) {
                              currentCart = client.cart.items;
                            }`;

const fixStr = `const cartField = client.cartData;
                            if (typeof cartField === 'string') {
                              try { currentCart = JSON.parse(cartField || '[]'); } catch(e){}
                            } else if (Array.isArray(cartField)) {
                              currentCart = cartField;
                            } else if (cartField && cartField.items) {
                              currentCart = cartField.items;
                            }`;

if (code.includes(buggyStr)) {
  code = code.replace(buggyStr, fixStr);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Fixed client.cart to cartData');
} else {
  console.log('Buggy string not found for client.cart');
}
