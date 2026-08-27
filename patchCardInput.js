const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

// 1. Remove the modal
const modalStart = code.indexOf('{/* Add To Cart Modal */}');
if (modalStart !== -1) {
  const modalEnd = code.indexOf(')}', modalStart) + 2;
  code = code.substring(0, modalStart) + code.substring(modalEnd);
}

// 2. Add local state to the card by replacing the button with a self-contained component or direct DOM reading.
// Since MessageList is one huge component, we can just use an uncontrolled input and read its value using document.getElementById on click.

const oldBtnRegex = /<button\s*onClick=\{\(e\) => \{\s*e\.preventDefault\(\);\s*setCartQty\(1\);\s*setAddToCartModal\(msg\);\s*\}\}[\s\S]*?<\/button>/m;

const newBtnAndInput = `<div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-sales-slate-700 bg-sales-slate-800 overflow-hidden h-8">
                        <button 
                          onClick={(e) => {
                            const input = document.getElementById(\`qty-\${msg.id}\`);
                            if(input) input.value = Math.max(1, parseInt(input.value || 1) - 1);
                          }}
                          className="px-2 h-full text-sales-slate-300 hover:bg-sales-slate-700 transition-colors"
                        >-</button>
                        <input 
                          id={\`qty-\${msg.id}\`}
                          type="number" 
                          min="1" 
                          defaultValue="1" 
                          className="w-10 h-full bg-transparent text-center text-white text-xs focus:outline-none"
                        />
                        <button 
                          onClick={(e) => {
                            const input = document.getElementById(\`qty-\${msg.id}\`);
                            if(input) input.value = parseInt(input.value || 0) + 1;
                          }}
                          className="px-2 h-full text-sales-slate-300 hover:bg-sales-slate-700 transition-colors"
                        >+</button>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          const input = document.getElementById(\`qty-\${msg.id}\`);
                          const qty = input ? parseInt(input.value || 1) : 1;
                          if (activeConversation && activeConversation.client) {
                            try {
                              const cartData = typeof activeConversation.client.cart === 'string' 
                                ? JSON.parse(activeConversation.client.cart || '[]') 
                                : (activeConversation.client.cart || []);
                              
                              const currentItems = Array.isArray(cartData) ? cartData : (cartData.items || []);
                              
                              const newItems = [...currentItems, { 
                                  clave: msg.metadata.clave, 
                                  descripcion: msg.metadata.description, 
                                  precio: parseFloat(msg.metadata.priceNet || 0),
                                  cantidad: qty 
                              }];
                              
                              let newCartData = newItems;
                              if (cartData && !Array.isArray(cartData)) {
                                newCartData = { ...cartData, items: newItems };
                              }
                              
                              await updateClientCart(activeConversation.client.id, newCartData);
                              
                              // Nice Toast-like feedback on the button
                              const originalText = e.currentTarget.innerHTML;
                              e.currentTarget.innerHTML = '<span class="text-green-400">¡Añadido!</span>';
                              setTimeout(() => {
                                if(e.currentTarget) e.currentTarget.innerHTML = originalText;
                              }, 2000);
                            } catch (err) {
                              console.error('Error adding to cart', err);
                              alert('Error al añadir al carrito');
                            }
                          }
                        }}
                        className="flex-1 h-8 bg-sales-slate-700 border border-sales-slate-600 hover:bg-sales-cyan-600 hover:border-sales-cyan-600 text-white font-medium px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <ShoppingCart className="w-3 h-3" /> Añadir
                      </button>
                    </div>`;

code = code.replace(oldBtnRegex, newBtnAndInput);

fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
console.log('Card input patched');
