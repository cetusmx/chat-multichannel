const fs = require('fs');
let code = fs.readFileSync('frontend/src/stores/useChatStore.js', 'utf8');

code = code.replace(
  'cartData: cartData,',
  'cartData: cartData,\n                  cart: typeof cartData === "string" ? cartData : JSON.stringify(cartData),'
);

fs.writeFileSync('frontend/src/stores/useChatStore.js', code);
console.log('Fixed useChatStore to properly update client.cart on socket event.');
