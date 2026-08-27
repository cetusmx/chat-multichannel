const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

const buggyStr = `                              await updateClientCart(conv.client.id, newCartData);
                              
                              const originalText = e.currentTarget.innerHTML;
                              e.currentTarget.innerHTML = '<span class="text-green-400">¡Añadido!</span>';
                              setTimeout(() => {
                                if(e.currentTarget) e.currentTarget.innerHTML = originalText;
                              }, 2000);`;

const fixStr = `                              const btn = e.currentTarget;
                              const originalText = btn.innerHTML;
                              await updateClientCart(conv.client.id, newCartData);
                              btn.innerHTML = '<span class="text-green-400">¡Añadido!</span>';
                              setTimeout(() => {
                                if(btn) btn.innerHTML = originalText;
                              }, 2000);`;

if(code.includes(buggyStr)) {
  code = code.replace(buggyStr, fixStr);
  fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
  console.log('Fixed currentTarget error.');
} else {
  // Maybe encoding issue with '¡Añadido!'?
  const safeRegex = /await updateClientCart\(conv\.client\.id, newCartData\);\s*const originalText = e\.currentTarget\.innerHTML;[\s\S]*?\}, 2000\);/m;
  if(code.match(safeRegex)) {
    code = code.replace(safeRegex, `const btn = e.currentTarget;
                              const originalText = btn.innerHTML;
                              await updateClientCart(conv.client.id, newCartData);
                              btn.innerHTML = '<span class="text-green-400">¡Añadido!</span>';
                              setTimeout(() => {
                                if(btn) btn.innerHTML = originalText;
                              }, 2000);`);
    fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
    console.log('Fixed currentTarget error (via regex).');
  } else {
    console.log('Could not find the target string');
  }
}
