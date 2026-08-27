const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

code = code.replace(
  /const cartData = typeof conv\.client\.cart === 'string'\s*\?\s*JSON\.parse\(conv\.client\.cart \|\| '\[\]'\)\s*:\s*\(conv\.client\.cart \|\| \[\]\);/g,
  `const rawCart = conv.client.cartData || conv.client.cart;
                              const cartData = typeof rawCart === 'string' 
                                ? JSON.parse(rawCart || '[]') 
                                : (rawCart || []);`
);

fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
console.log('Fixed MessageList.jsx cart resolution.');
