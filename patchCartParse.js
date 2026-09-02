const fs = require('fs');
const filepath = 'mobile/src/screens/CartModal.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const parse_old = /if \(Array\.isArray\(cartData\)\) \{\s*cartItems = cartData;\s*\} else if \(cartData && cartData\.items\) \{\s*cartItems = cartData\.items;\s*shippingAddress = cartData\.shippingAddress \|\| '';\s*razonSocial = cartData\.razonSocial \|\| '';\s*rfc = cartData\.rfc \|\| cartData\.RFC \|\| '';\s*billingAddress = cartData\.billingAddress \|\| cartData\.domicilioFiscal \|\| '';\s*\}/m;

const parse_new = `if (Array.isArray(cartData)) {
    cartItems = cartData;
  } else if (cartData) {
    cartItems = cartData.items || [];
    shippingAddress = cartData.shippingAddress || '';
    razonSocial = cartData.razonSocial || '';
    rfc = cartData.rfc || cartData.RFC || '';
    billingAddress = cartData.billingAddress || cartData.domicilioFiscal || '';
  }`;

if (parse_old.test(code)) {
    code = code.replace(parse_old, parse_new);
    fs.writeFileSync(filepath, code);
    console.log('Patched CartModal cartData parsing.');
} else {
    console.log('Could not find match in CartModal.');
}
