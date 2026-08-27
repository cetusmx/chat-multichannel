const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

const regex = /<button[\s\S]*?className="w-full mt-1 bg-sales-cyan-600[\s\S]*?<\/button>/m;

const newBtn = `<button
                        onClick={(e) => {
                          e.preventDefault();
                          setCartQty(1);
                          setAddToCartModal(msg);
                        }}
                        className="w-full mt-2 bg-sales-slate-700 border border-sales-slate-600 hover:bg-sales-cyan-600 hover:border-sales-cyan-600 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-3 h-3" /> Añadir al carrito
                      </button>`;
                      
if (code.match(regex)) {
  code = code.replace(regex, newBtn);
  fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
  console.log('Button patched successfully');
} else {
  console.log('Regex failed');
}
