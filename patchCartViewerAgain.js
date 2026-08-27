const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/CartViewer.jsx', 'utf8');

const regex = /const handleSendSummary = \(\) => \{[\s\S]*?sendMessage\(text, false\);\s*\};/;
const newHandleSendSummary = `const handleSendSummary = () => {
    if (cartItems.length === 0) return;
    
    let text = '🛒 *RESUMEN DE COTIZACIÓN*\\n';
    cartItems.forEach(item => {
      text += \`▫️ \${item.cantidad}x \${item.clave}\\n\`;
    });
    text += \`\\n*Total Neto:* $\${total.toFixed(2)}\`;

    const metadata = {
      items: cartItems.map(item => ({
        clave: item.clave,
        descripcion: item.descripcion,
        precio: item.precio || 0,
        cantidad: item.cantidad || 1
      })),
      subtotal,
      iva,
      total,
      shippingAddress
    };

    sendMessage(text, false, 'CART_SUMMARY', metadata);
  };`;

if (code.match(regex)) {
  code = code.replace(regex, newHandleSendSummary);
  fs.writeFileSync('frontend/src/features/chat/components/CartViewer.jsx', code);
  console.log('Fixed CartViewer logic');
} else {
  console.log('Still not found');
}
