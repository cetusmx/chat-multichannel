const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/CartViewer.jsx', 'utf8');

const oldHandleSendSummary = `const handleSendSummary = () => {
    if (cartItems.length === 0) return;

    let text = '*🛒 RESUMEN DE CARRITO*\\n';
    text += '----------------------------------------\\n';

    cartItems.forEach(item => {
      const lineTotal = (item.precio || 0) * (item.cantidad || 1);
      text += \`\${item.cantidad}x \${item.clave}\\n\`;
      text += \`_\${item.descripcion}_\\n\`;
      text += \`$\${(item.precio || 0).toFixed(2)} c/u  ->  $\${lineTotal.toFixed(2)}\\n\`;
      text += '----------------------------------------\\n';
    });

    text += \`*Subtotal:* $\${subtotal.toFixed(2)}\\n\`;
    text += \`*IVA (16%):* $\${iva.toFixed(2)}\\n\`;
    text += \`*Total Neto:* $\${total.toFixed(2)}\\n\`;

    if (shippingAddress) {
      text += \`\\n*Dirección de Envío:*\\n\${shippingAddress}\`;
    }

    useChatStore.getState().sendMessage(text, false);
  };`;

const newHandleSendSummary = `const handleSendSummary = () => {
    if (cartItems.length === 0) return;
    
    // Fallback text format (still generated for database/API fallback)
    let text = '🛒 *RESUMEN DE COTIZACIÓN*\\n';
    cartItems.forEach(item => {
      const lineTotal = (item.precio || 0) * (item.cantidad || 1);
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

    useChatStore.getState().sendMessage(text, false, 'CART_SUMMARY', metadata);
  };`;

if (code.includes('const handleSendSummary = () => {')) {
  // Regex approach because of potential unicode/spaces
  code = code.replace(/const handleSendSummary = \(\) => \{[\s\S]*?useChatStore\.getState\(\)\.sendMessage\(text, false\);\s*\};/, newHandleSendSummary);
  fs.writeFileSync('frontend/src/features/chat/components/CartViewer.jsx', code);
  console.log('CartViewer patched');
} else {
  console.log('handleSendSummary not found');
}
