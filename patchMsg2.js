const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

// 1. Add state for modal
code = code.replace(
  'const { user } = useAuthStore();',
  'const { user } = useAuthStore();\n  const [addToCartModal, setAddToCartModal] = useState(null);\n  const [cartQty, setCartQty] = useState(1);'
);

// 2. Add Modal UI at the bottom of the return statement
const modalUI = `
      {/* Add To Cart Modal */}
      {addToCartModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-sales-slate-100">Añadir al Carrito</h3>
            <div className="mb-4 flex items-center gap-4">
              <div className="h-16 w-16 bg-white rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                {addToCartModal.metadata.imageUrl ? (
                  <img src={addToCartModal.metadata.imageUrl} alt={addToCartModal.metadata.clave} className="max-h-full max-w-full object-contain" />
                ) : (
                  <ShoppingCart className="text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sales-cyan-400">{addToCartModal.metadata.clave}</p>
                <p className="text-xs text-sales-slate-400 line-clamp-2">{addToCartModal.metadata.description}</p>
                <p className="text-sm font-bold mt-1 text-white">$\{(parseFloat(addToCartModal.metadata.priceNet)).toFixed(2)} Neto</p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-sales-slate-400 mb-2">Cantidad</label>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCartQty(Math.max(1, cartQty - 1))}
                  className="w-10 h-10 rounded-lg bg-sales-slate-800 border border-sales-slate-700 flex items-center justify-center text-white hover:bg-sales-slate-700 transition-colors"
                >
                  -
                </button>
                <input 
                  type="number" 
                  min="1" 
                  value={cartQty} 
                  onChange={(e) => setCartQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 h-10 bg-sales-slate-800 border border-sales-slate-700 text-center text-white rounded-lg focus:outline-none focus:border-sales-cyan-500"
                />
                <button 
                  onClick={() => setCartQty(cartQty + 1)}
                  className="w-10 h-10 rounded-lg bg-sales-slate-800 border border-sales-slate-700 flex items-center justify-center text-white hover:bg-sales-slate-700 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setAddToCartModal(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-sales-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (activeConversation && activeConversation.client) {
                    try {
                      const cartData = typeof activeConversation.client.cart === 'string' 
                        ? JSON.parse(activeConversation.client.cart || '[]') 
                        : (activeConversation.client.cart || []);
                      
                      const currentItems = Array.isArray(cartData) ? cartData : (cartData.items || []);
                      
                      const newItems = [...currentItems, { 
                          clave: addToCartModal.metadata.clave, 
                          descripcion: addToCartModal.metadata.description, 
                          precio: parseFloat(addToCartModal.metadata.priceNet),
                          cantidad: cartQty 
                      }];
                      
                      let newCartData = newItems;
                      if (cartData && !Array.isArray(cartData)) {
                        newCartData = { ...cartData, items: newItems };
                      }
                      
                      await updateClientCart(activeConversation.client.id, newCartData);
                      setAddToCartModal(null);
                    } catch (err) {
                      console.error('Error adding to cart', err);
                      alert('Error al añadir al carrito');
                    }
                  }
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-sales-cyan-600 hover:bg-sales-cyan-700 transition-colors"
              >
                Añadir al carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>`;

// Replace closing div of MessageList to insert modalUI before it
code = code.replace(
  /<\/div>\s*$/m,
  modalUI + '\n'
);

// 3. Replace the onClick of the Add to Cart button inside the loop
const regexBtn = /<button[^>]*onClick=\{\(e\) => \{[\s\S]*?className="w-full mt-1 bg-sales-cyan-600[\s\S]*?>\s*<ShoppingCart[^>]*\/> Añadir al carrito\s*<\/button>/m;

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

code = code.replace(regexBtn, newBtn);

fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
console.log('MessageList patched successfully.');
