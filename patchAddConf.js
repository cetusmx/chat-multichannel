const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

const targetStr = `                              const btn = e.currentTarget;
                              const originalText = btn.innerHTML;
                              await updateClientCart(conv.client.id, newCartData);
                              btn.innerHTML = '<span class="text-green-400">¡Añadido!</span>';
                              setTimeout(() => {
                                if(btn) btn.innerHTML = originalText;
                              }, 2000);`;

const newStr = `                              const btn = e.currentTarget;
                              const originalText = btn.innerHTML;
                              await updateClientCart(conv.client.id, newCartData);
                              btn.innerHTML = '<span class="text-green-400">¡Añadido!</span>';
                              
                              // Send confirmation to client!
                              useChatStore.getState().sendMessage(\`¡Listo! He añadido \${qty} piezas de *\${msg.metadata.clave}* a tu cotización.\`, false);

                              setTimeout(() => {
                                if(btn) btn.innerHTML = originalText;
                              }, 2000);`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
  console.log('Confirmation injected successfully in MessageList.');
} else {
  console.log('Could not find target string in MessageList.jsx');
}
