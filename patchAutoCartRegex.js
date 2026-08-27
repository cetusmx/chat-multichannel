const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const regex = /\/\/\s*---\s*PUSH NOTIFICATION INTEGRATION\s*---/;

const autoCartLogic = `// --- AUTO ADD TO CART LOGIC ---
              try {
                if (msgRecord && msgRecord.senderType === 'CLIENT' && msgRecord.content) {
                  const textStr = msgRecord.content.trim();
                  const qtyMatch = textStr.match(/^\\s*(?:quiero\\s+|quisiera\\s+|deme\\s+|agregar\\s+|)?(\\d+)\\s*(?:piezas?|pzs?|unidades?|pz)?\\s*$/i);
                  
                  if (qtyMatch) {
                    const qty = parseInt(qtyMatch[1], 10);
                    if (qty > 0) {
                      const recentMsgs = await prisma.message.findMany({
                        where: { conversationId: conversation.id },
                        orderBy: { createdAt: 'desc' },
                        take: 3
                      });
                      
                      if (
                        recentMsgs.length >= 3 &&
                        recentMsgs[1].senderType === 'SYSTEM' &&
                        recentMsgs[1].content.includes('¿Cuántas piezas vas a requerir') &&
                        recentMsgs[2].content.includes('(Clave:')
                      ) {
                        const claveMatch = recentMsgs[2].content.match(/\\(Clave:\\s*([^\\)]+)\\)/);
                        if (claveMatch) {
                          const targetClave = claveMatch[1];
                          
                          const productMsgs = await prisma.message.findMany({
                            where: { conversationId: conversation.id, type: 'PRODUCT_CARD' },
                            orderBy: { createdAt: 'desc' },
                            take: 20
                          });
                          
                          const pCard = productMsgs.find(m => m.metadata && m.metadata.clave === targetClave);
                          
                          if (pCard) {
                            let currentCart = [];
                            if (typeof client.cart === 'string') {
                              try { currentCart = JSON.parse(client.cart || '[]'); } catch(e){}
                            } else if (Array.isArray(client.cart)) {
                              currentCart = client.cart;
                            } else if (client.cart && client.cart.items) {
                              currentCart = client.cart.items;
                            }
                            
                            if (!Array.isArray(currentCart)) currentCart = [];
                            
                            const existingIdx = currentCart.findIndex(i => i.clave === targetClave);
                            if (existingIdx >= 0) {
                              currentCart[existingIdx].cantidad += qty;
                            } else {
                              currentCart.push({
                                clave: targetClave,
                                descripcion: pCard.metadata.description,
                                precio: parseFloat(pCard.metadata.priceNet || 0),
                                cantidad: qty
                              });
                            }
                            
                            const updatedCartJson = JSON.stringify(currentCart);
                            await prisma.client.update({
                              where: { id: client.id },
                              data: { cart: updatedCartJson }
                            });
                            
                            const io = require('../socket').getIo();
                            io.of('/chat').to(\`tenant_\${tenantId}_coordinators\`).emit('cart_updated', { clientId: client.id, cartData: currentCart });
                            if (conversation.vendorId) {
                              io.of('/chat').to(\`vendor_\${conversation.vendorId}\`).emit('cart_updated', { clientId: client.id, cartData: currentCart });
                            }
                            
                            setTimeout(async () => {
                              await this.sendMessage(
                                conversation.id,
                                \`¡Listo! He añadido \${qty} piezas de *\${targetClave}* a tu cotización. ¿Te puedo ayudar con algo más?\`,
                                null,
                                'SYSTEM'
                              );
                            }, 1500);
                          }
                        }
                      }
                    }
                  }
                }
              } catch (autoCartErr) {
                logger.error('[WHATSAPP_SERVICE] Failed to auto-add to cart:', autoCartErr);
              }
              
              // --- PUSH NOTIFICATION INTEGRATION ---`;

if (code.match(regex)) {
  code = code.replace(regex, autoCartLogic);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Auto cart logic injected via regex.');
} else {
  console.log('Regex not found!');
}
