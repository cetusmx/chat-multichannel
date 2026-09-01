import re
import os

filepath = 'mobile/src/screens/CartModal.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
code = re.sub(
    r"import \{ X, Send, Download, Mail, Edit2, Search, MessageSquare, ShoppingCart as ShoppingCartIcon, Package \} from 'lucide-react-native';",
    "import { X, Send, Download, Mail, Edit2, Search, MessageSquare, ShoppingCart as ShoppingCartIcon, Package, Plus, Minus, Trash2, Trash } from 'lucide-react-native';",
    code
)

# 2. Search state
code = re.sub(
    r"const \[searchForm, setSearchForm\] = useState\(\{ query: '', familia: '' \}\);",
    "const [searchForm, setSearchForm] = useState({ familia: '', sist_med: 'std', diam_int: '', diam_ext: '', altura: '', seccion: '' });",
    code
)

# 3. suggest product
suggest_product_old = r"""  const handleSuggestProduct = \(product\) => \{
    const desc = product\.DESC_ECOMM \|\| product\.DESCR \|\| product\.NOMBRE;
    const priceNet = \(\(product\.PRECIO \|\| 0\) \* 1\.16\)\.toFixed\(2\);
    const msg = `Tengo esta opcin:\\n\*\$\{product\.CVE_ART\}\* - \$\{desc\}\\nPrecio: \$\$\{priceNet\} Neto \(IVA Incluido\)`;
    sendMessage\(msg, false\);
    onClose\(\); // Optional: close modal so user sees chat, this is good UX\.
  \};"""
suggest_product_new = """  const handleSuggestProduct = (product) => {
    const desc = product.DESC_ECOMM || product.DESCR || product.NOMBRE;
    const priceNet = ((product.PRECIO || 0) * 1.16).toFixed(2);
    const linea = product.LIN_PROD || '';
    const imageUrl = `https://sistemahidraulico.mx/Perfiles/${linea}.jpg`;

    const metadata = {
      clave: product.CVE_ART,
      description: desc,
      priceNet: priceNet,
      imageUrl: imageUrl,
      rawProduct: product
    };

    sendMessage('', false, 'PRODUCT_CARD', metadata);
    onClose();
  };"""
code = re.sub(suggest_product_old, suggest_product_new, code)

# 4. handleSendSummary
send_summary_old = r"""  const handleSendSummary = \(\) => \{
    let text = '\*RESUMEN DE COTIZACIN\*\\n\\n';
    
    cartItems\.forEach\(item => \{
      const lineTotal = \(\(item\.precio \|\| 0\) \* \(item\.cantidad \|\| 1\)\);
      text \+= `  \$\{item\.cantidad\}x \$\{item\.clave\}\\n`;
      text \+= `  \$\{item\.descripcion\}\\n`;
      text \+= `  \*\$\$\{lineTotal\.toFixed\(2\)\}\*\\n\\n`;
    \}\);

    text \+= `\*Subtotal:\* \$\$\{subtotal\.toFixed\(2\)\}\\n`;
    text \+= `\*IVA \(16%\):\* \$\$\{iva\.toFixed\(2\)\}\\n`;
    text \+= `\*Total Neto:\* \$\$\{total\.toFixed\(2\)\}\\n`;

    if \(shippingAddress\) \{
      text \+= `\\n\*Direccin de Envo:\*\\n\$\{shippingAddress\}`;
    \}

    if \(sendMessage\) \{
      sendMessage\(text, false\);
      Toast\.show\(\{ type: 'success', text1: 'Resumen enviado al chat' \}\);
      onClose\(\);
    \} else \{
      Toast\.show\(\{ type: 'error', text1: 'No se pudo enviar el mensaje' \}\);
    \}
  \};"""
send_summary_new = """  const handleSendSummary = () => {
    if (cartItems.length === 0) return;
    
    let text = '🧾 *RESUMEN DE COTIZACIÓN*\\n';
    cartItems.forEach(item => {
      text += `🔹 ${item.cantidad}x ${item.clave}\\n`;
    });
    text += `\\n*Total Neto:* $${total.toFixed(2)}`;

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
      await patch(`/clients/${chat.client.id}/cart`, { cartData: newCartData });
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
  };"""
code = re.sub(send_summary_old, send_summary_new, code)

# 5. Cart items UI
cart_items_old = r"""              <Text style=\{styles\.sectionTitle\}>Partidas del Carrito</Text>
              \{cartItems\.length === 0 \? \(
                <Text style=\{styles\.emptyText\}>El carrito est vaco</Text>
              \) : \(
                cartItems\.map\(\(item, idx\) => \{
                  const lineTotal = \(\(item\.precio \|\| 0\) \* \(item\.cantidad \|\| 1\)\);
                  return \(
                    <View key=\{idx\} style=\{styles\.cartItem\}>
                      <View style=\{styles\.itemHeader\}>
                        <Text style=\{styles\.itemClave\}>\{item\.cantidad\}x \{item\.clave\}</Text>
                        <Text style=\{styles\.itemTotal\}>\$\{lineTotal\.toFixed\(2\)\}</Text>
                      </View>
                      <Text style=\{styles\.itemDesc\}>\{item\.descripcion\}</Text>
                      <Text style=\{styles\.itemPrice\}>\$\{\(item\.precio \|\| 0\)\.toFixed\(2\)\} c/u</Text>
                    </View>
                  \);
                \}\)
              \)\}"""
cart_items_new = """              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
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
                        <Text style={styles.itemTotal}>${lineTotal.toFixed(2)}</Text>
                      </View>
                      <Text style={styles.itemDesc}>{item.descripcion}</Text>
                      
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10}}>
                        <Text style={styles.itemPrice}>${(item.precio || 0).toFixed(2)} c/u</Text>
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
              )}"""
code = re.sub(cart_items_old, cart_items_new, code)

# 6. Advanced search UI
search_ui_old = r"""              <View style=\{styles\.searchSection\}>
                <TextInput
                  style=\{styles\.catalogSearchInput\}
                  placeholder="Buscar producto\.\.\."
                  placeholderTextColor="#64748b"
                  value=\{searchForm\.query\}
                  onChangeText=\{\(t\) => setSearchForm\(\{ \.\.\.searchForm, query: t \}\)\}
                  onSubmitEditing=\{handleSearchCatalog\}
                />
                <TouchableOpacity style=\{styles\.catalogSearchBtn\} onPress=\{handleSearchCatalog\}>
                  <Search size=\{18\} color="#fff" />
                </TouchableOpacity>
              </View>"""
search_ui_new = """              <View style={[styles.searchSection, {flexDirection: 'column', gap: 8}]}>
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
                <TouchableOpacity style={[styles.catalogSearchBtn, {width: '100%', marginTop: 4}]} onPress={handleSearchCatalog}>
                  <Search size={18} color="#fff" />
                  <Text style={{color: '#fff', fontWeight: 'bold', marginLeft: 8}}>Buscar</Text>
                </TouchableOpacity>
              </View>"""
code = re.sub(search_ui_old, search_ui_new, code)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched mobile catalog successfully.")
