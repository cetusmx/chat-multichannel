const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

const anchor = `                {msg.type === 'PRODUCT_CARD' && msg.metadata ? (`;

const uiSummary = `                {msg.type === 'CART_SUMMARY' && msg.metadata ? (
                  <div className="mt-2 bg-gradient-to-br from-sales-slate-800 to-sales-slate-900 rounded-xl p-4 border border-sales-cyan-900/30 shadow-lg shadow-sales-cyan-900/10 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-sales-cyan-600/10 rounded-full blur-xl"></div>
                    <div className="flex items-center gap-2 border-b border-sales-slate-700/50 pb-2">
                      <div className="bg-sales-cyan-500/20 p-1.5 rounded-lg">
                        <ShoppingCart className="w-4 h-4 text-sales-cyan-400" />
                      </div>
                      <span className="font-bold text-sm text-sales-slate-200">Resumen de Cotización</span>
                    </div>
                    
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                      {(msg.metadata.items || []).map((item, idx) => (
                        <div key={idx} className="flex gap-2 text-xs items-start">
                          <span className="font-mono text-sales-cyan-400 bg-sales-cyan-950/50 px-1.5 rounded border border-sales-cyan-800/30">{item.cantidad}x</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sales-slate-300 truncate">{item.clave}</div>
                            <div className="text-[10px] text-sales-slate-500 line-clamp-1">{item.descripcion}</div>
                          </div>
                          <span className="text-sales-slate-300 font-mono whitespace-nowrap">$\{(item.precio * item.cantidad).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-1 pt-2 border-t border-sales-slate-700/50 flex flex-col gap-1 text-xs">
                      <div className="flex justify-between text-sales-slate-400">
                        <span>Subtotal</span>
                        <span className="font-mono">$\{(msg.metadata.subtotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sales-slate-400">
                        <span>IVA (16%)</span>
                        <span className="font-mono">$\{(msg.metadata.iva || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sales-cyan-400 font-bold text-sm mt-1">
                        <span>TOTAL NETO</span>
                        <span className="font-mono">$\{(msg.metadata.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {msg.metadata.shippingAddress && (
                      <div className="mt-2 bg-sales-slate-800/80 p-2 rounded border border-sales-slate-700/50 text-[10px] text-sales-slate-400">
                        <span className="font-semibold text-sales-slate-300 block mb-0.5">🚚 Envío a:</span>
                        {msg.metadata.shippingAddress}
                      </div>
                    )}
                  </div>
                ) : null}
                {msg.type === 'PRODUCT_CARD' && msg.metadata ? (`

code = code.replace(anchor, uiSummary);
fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
console.log('MessageList rendering patched');
