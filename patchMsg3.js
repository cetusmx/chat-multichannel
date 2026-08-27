const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

const oldCodeStart = 'updateClientCart(conv.client.id, newCartData)';
const oldCodeEnd = 'Añadir al carrito';

const startIdx = code.lastIndexOf('if (conv && conv.client) {');
if (startIdx > -1) {
  // We need to replace the entire onClick handler of the button
  const oldBtnStr = code.substring(code.indexOf('onClick={(e) => {', startIdx), code.indexOf('</button>', startIdx) + 9);
  
  const newBtn = `onClick={(e) => {
                          e.preventDefault();
                          setCartQty(1);
                          setAddToCartModal(msg);
                        }}
                        className="w-full mt-2 bg-sales-slate-700 border border-sales-slate-600 hover:bg-sales-cyan-600 hover:border-sales-cyan-600 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-3 h-3" /> Añadir al carrito
                      </button>`;
                      
  code = code.replace(oldBtnStr, newBtn);
  fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
  console.log('Button patched successfully');
}
