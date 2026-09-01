const fs = require('fs');

const filepath = 'mobile/src/screens/CartModal.jsx';
let code = fs.readFileSync(filepath, 'utf8');

// 1. Imports
code = code.replace(
  /import \{ X, Send, Download, Mail, Edit2, Search, MessageSquare, ShoppingCart as ShoppingCartIcon, Package \} from 'lucide-react-native';/,
  "import { X, Send, Download, Mail, Edit2, Search, MessageSquare, ShoppingCart as ShoppingCartIcon, Package, Plus, Minus, Trash2, Trash } from 'lucide-react-native';"
);

// 2. Search state
code = code.replace(
  /const \[searchForm, setSearchForm\] = useState\(\{ query: '', familia: '' \}\);/,
  "const [searchForm, setSearchForm] = useState({ familia: '', sist_med: 'std', diam_int: '', diam_ext: '', altura: '', seccion: '' });"
);

// 3. suggest product
const suggest_product_old = /const handleSuggestProduct = \(product\) => \{\s*const desc = product\.DESC_ECOMM \|\| product\.DESCR \|\| product\.NOMBRE;\s*const priceNet = \(\(product\.PRECIO \|\| 0\) \* 1\.16\)\.toFixed\(2\);\s*const msg = `Tengo esta opcin:\\n\*\$\{product\.CVE_ART\}\* - \$\{desc\}\\nPrecio: \$\$\{priceNet\} Neto \(IVA Incluido\)`;\s*sendMessage\(msg, false\);\s*onClose\(\);\s*\};/m;
const suggest_product_new = `const handleSuggestProduct = (product) => {
    const desc = product.DESC_ECOMM || product.DESCR || product.NOMBRE;
    const priceNet = ((product.PRECIO || 0) * 1.16).toFixed(2);
    const linea = product.LIN_PROD || '';
    const imageUrl = \`https://sistemahidraulico.mx/Perfiles/\${linea}.jpg\`;

    const metadata = {
      clave: product.CVE_ART,
      description: desc,
      priceNet: priceNet,
      imageUrl: imageUrl,
      rawProduct: product
    };

    sendMessage('', false, 'PRODUCT_CARD', metadata);
    onClose();
  };`;
code = code.replace(suggest_product_old, suggest_product_new);

// 4. handleSendSummary
const send_summary_old = /const handleSendSummary = \(\) => \{[\s\S]*?Toast\.show\(\{ type: 'error', text1: 'No se pudo enviar el mensaje' \}\);\s*\}\s*\};/m;
const send_summary_new = `const handleSendSummary = () => {
    if (cartItems.length === 0) return;
    
    let text = '🧾 *RESUMEN DE COTIZACIÓN*\\n';
    cartItems.forEach(item => {
      text += \`🔹 \${item.cantidad}x \${item.clave}\\n\`;
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

    if (sendMessage) {
      sendMessage(text, false, 'CART_SUMMARY', metadata);
      Toast.show({ type: 'success', text1: 'Resumen enviado al chat' });
      onClose();
    }
  };

  const saveCartToServer = async (newItems) => {
    try {
      const newCartData = { ...cartData, items: newItems };
      await patch(\`/clients/\${chat.client.id}/cart\`, { cartData: newCartData });
      updateChat(chat.id, { client: { ...chat.client, cartData: newCartData } });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al actualizar carrito' });
    }
  };

  const updateItemQuantity = async (index, delta) => {
    const newItems = [...cartItems];
    const item = newItems[index];
    item.cantidad = (item.cantidad || 1) + delta;
    if (item.cantidad <= 0) {
      newItems.splice(index, 1);
    }
    await saveCartToServer(newItems);
  };

  const removeItem = async (index) => {
    const newItems = [...cartItems];
    newItems.splice(index, 1);
    await saveCartToServer(newItems);
  };

  const emptyCart = async () => {
    await saveCartToServer([]);
  };`;
code = code.replace(send_summary_old, send_summary_new);

// 5. Cart items UI
const cart_items_old = /<Text style=\{styles\.sectionTitle\}>Partidas del Carrito<\/Text>[\s\S]*?\{cartItems\.length === 0 \? \([\s\S]*?<Text style=\{styles\.emptyText\}>El carrito est vaco<\/Text>[\s\S]*?\) : \([\s\S]*?cartItems\.map\(\(item, idx\) => \{[\s\S]*?const lineTotal = \(\(item\.precio \|\| 0\) \* \(item\.cantidad \|\| 1\)\);[\s\S]*?return \([\s\S]*?<View key=\{idx\} style=\{styles\.cartItem\}>[\s\S]*?<View style=\{styles\.itemHeader\}>[\s\S]*?<Text style=\{styles\.itemClave\}>\{item\.cantidad\}x \{item\.clave\}<\/Text>[\s\S]*?<Text style=\{styles\.itemTotal\}>\$\{lineTotal\.toFixed\(2\)\}<\/Text>[\s\S]*?<\/View>[\s\S]*?<Text style=\{styles\.itemDesc\}>\{item\.descripcion\}<\/Text>[\s\S]*?<Text style=\{styles\.itemPrice\}>\$\{\(item\.precio \|\| 0\)\.toFixed\(2\)\} c\/u<\/Text>[\s\S]*?<\/View>[\s\S]*?\);[\s\S]*?\}\)[\s\S]*?\)\}/m;
const cart_items_new = `<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                <Text style={[styles.sectionTitle, {marginBottom: 0}]}>Partidas del Carrito</Text>
                {cartItems.length > 0 && (
                  <TouchableOpacity onPress={emptyCart} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    <Trash2 size={14} color="#ef4444" />
                    <Text style={{color: '#ef4444', fontSize: 12}}>Vaciar</Text>
                  </TouchableOpacity>
                )}
              </View>
              {cartItems.length === 0 ? (
                <Text style={styles.emptyText}>El carrito está vacío</Text>
              ) : (
                cartItems.map((item, idx) => {
                  const lineTotal = ((item.precio || 0) * (item.cantidad || 1));
                  return (
                    <View key={idx} style={styles.cartItem}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemClave}>{item.clave}</Text>
                        <Text style={styles.itemTotal}>\${lineTotal.toFixed(2)}</Text>
                      </View>
                      <Text style={styles.itemDesc}>{item.descripcion}</Text>
                      
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10}}>
                        <Text style={styles.itemPrice}>\${(item.precio || 0).toFixed(2)} c/u</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                          <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 6}}>
                            <TouchableOpacity onPress={() => updateItemQuantity(idx, -1)} style={{padding: 6}}>
                              <Minus size={14} color="#94a3b8" />
                            </TouchableOpacity>
                            <Text style={{color: '#fff', fontSize: 14, minWidth: 20, textAlign: 'center'}}>{item.cantidad || 1}</Text>
                            <TouchableOpacity onPress={() => updateItemQuantity(idx, 1)} style={{padding: 6}}>
                              <Plus size={14} color="#94a3b8" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity onPress={() => removeItem(idx)} style={{padding: 6, backgroundColor: '#451a20', borderRadius: 6}}>
                            <Trash size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}`;
code = code.replace(cart_items_old, cart_items_new);

// 6. Advanced search UI
const search_ui_old = /<View style=\{styles\.searchSection\}>[\s\S]*?<TextInput[\s\S]*?style=\{styles\.catalogSearchInput\}[\s\S]*?placeholder="Buscar producto\.\.\."[\s\S]*?placeholderTextColor="#64748b"[\s\S]*?value=\{searchForm\.query\}[\s\S]*?onChangeText=\{\(t\) => setSearchForm\(\{ \.\.\.searchForm, query: t \}\)\}[\s\S]*?onSubmitEditing=\{handleSearchCatalog\}[\s\S]*?\/>[\s\S]*?<TouchableOpacity style=\{styles\.catalogSearchBtn\} onPress=\{handleSearchCatalog\}>[\s\S]*?<Search size=\{18\} color="#fff" \/>[\s\S]*?<\/TouchableOpacity>[\s\S]*?<\/View>/m;
const search_ui_new = `<View style={[styles.searchSection, {flexDirection: 'column', gap: 8}]}>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <TouchableOpacity 
                    style={[styles.catalogSearchInput, {flex: 1, padding: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: searchForm.sist_med === 'std' ? '#06b6d4' : '#1e293b'}]}
                    onPress={() => setSearchForm({ ...searchForm, sist_med: 'std' })}
                  >
                    <Text style={{color: searchForm.sist_med === 'std' ? '#fff' : '#94a3b8', fontWeight: 'bold'}}>STD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.catalogSearchInput, {flex: 1, padding: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: searchForm.sist_med === 'mil' ? '#06b6d4' : '#1e293b'}]}
                    onPress={() => setSearchForm({ ...searchForm, sist_med: 'mil' })}
                  >
                    <Text style={{color: searchForm.sist_med === 'mil' ? '#fff' : '#94a3b8', fontWeight: 'bold'}}>MIL</Text>
                  </TouchableOpacity>
                </View>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <TextInput style={[styles.catalogSearchInput, {flex: 1}]} placeholder="D. Interior" placeholderTextColor="#64748b" value={searchForm.diam_int} onChangeText={(t) => setSearchForm({ ...searchForm, diam_int: t })} />
                  <TextInput style={[styles.catalogSearchInput, {flex: 1}]} placeholder="D. Exterior" placeholderTextColor="#64748b" value={searchForm.diam_ext} onChangeText={(t) => setSearchForm({ ...searchForm, diam_ext: t })} />
                </View>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <TextInput style={[styles.catalogSearchInput, {flex: 1}]} placeholder="Altura" placeholderTextColor="#64748b" value={searchForm.altura} onChangeText={(t) => setSearchForm({ ...searchForm, altura: t })} />
                  <TextInput style={[styles.catalogSearchInput, {flex: 1}]} placeholder="Sección" placeholderTextColor="#64748b" value={searchForm.seccion} onChangeText={(t) => setSearchForm({ ...searchForm, seccion: t })} />
                </View>
                <TouchableOpacity style={[styles.catalogSearchBtn, {width: '100%', marginTop: 4, flexDirection: 'row', justifyContent: 'center'}]} onPress={handleSearchCatalog}>
                  <Search size={18} color="#fff" />
                  <Text style={{color: '#fff', fontWeight: 'bold', marginLeft: 8}}>Buscar</Text>
                </TouchableOpacity>
              </View>`;
code = code.replace(search_ui_old, search_ui_new);

fs.writeFileSync(filepath, code);
console.log("Patched mobile catalog successfully.");
