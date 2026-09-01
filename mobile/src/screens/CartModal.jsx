import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Send, Download, Mail, Edit2, Search, MessageSquare, ShoppingCart as ShoppingCartIcon, Package, Plus, Minus, Trash2, Trash } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import useAuthStore from '@shared/stores/useAuthStore';
import useChatStore from '@shared/stores/useChatStore';
import { get, patch, getSealMarketFamilias, searchSealMarketCatalog } from '../services/api';

export default function CartModal({ visible, onClose, chat }) {
  const insets = useSafeAreaInsets();
  const { sendMessage, updateChat } = useChatStore();
  const token = useAuthStore(s => s.token);

  // Tabs state
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'catalog'

  // Catalog State
  const [familias, setFamilias] = useState([]);
  const [searchForm, setSearchForm] = useState({ familia: '', sist_med: 'std', diam_int: '', diam_ext: '', altura: '', seccion: '' });
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (activeTab === 'catalog' && familias.length === 0) {
      getSealMarketFamilias()
        .then(data => setFamilias([{ FAMILIA: '' }, ...data])) // Add "Todas" option implicitly later if we want a picker, but for chips we can just use the array. We will just set data directly.
        .catch(err => console.log('Error familias:', err));
    }
  }, [activeTab, familias.length]);

  const handleSearchCatalog = async () => {
    if (!searchForm.familia) {
      Toast.show({ type: 'error', text1: 'Selecciona una familia', text2: 'Por favor selecciona una familia principal' });
      return;
    }
    setIsSearchingCatalog(true);
    try {
      const res = await searchSealMarketCatalog(searchForm);
      setSearchResults(res.data || []);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error buscando en catálogo' });
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  const handleInjectProduct = async (product) => {
    const newItems = [...cartItems];
    const desc = product.DESC_ECOMM || product.DESCR || product.NOMBRE;
    const existingIdx = newItems.findIndex(i => i.clave === product.CVE_ART);
    if (existingIdx >= 0) {
      newItems[existingIdx].cantidad = (newItems[existingIdx].cantidad || 1) + 1;
    } else {
      newItems.push({
        clave: product.CVE_ART,
        descripcion: desc,
        precio: (product.PRECIO || 0) * 1.16,
        cantidad: 1
      });
    }
    
    // Save to server
    try {
      const newCartData = { ...cartData, items: newItems };
      await patch(`/clients/${chat.client.id}/cart`, { cartData: newCartData });
      updateChat(chat.id, { client: { ...chat.client, cartData: newCartData } });
      Toast.show({ type: 'success', text1: 'Artículo añadido al carrito' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al añadir artículo' });
    }
  };

  const handleSuggestProduct = (product) => {
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
  };

  // Client and Cart Data extraction
  const cartData = chat?.client?.cartData || {};
  let cartItems = [];
  let shippingAddress = '';
  let razonSocial = '';
  let rfc = '';
  let billingAddress = '';

  if (Array.isArray(cartData)) {
    cartItems = cartData;
  } else if (cartData && cartData.items) {
    cartItems = cartData.items;
    shippingAddress = cartData.shippingAddress || '';
    razonSocial = cartData.razonSocial || '';
    rfc = cartData.rfc || cartData.RFC || '';
    billingAddress = cartData.billingAddress || cartData.domicilioFiscal || '';
  }

  const clientName = chat?.client?.name || '';
  const clientPhone = chat?.client?.phoneNumber || chat?.client?.phone || '';

  // Calculation
  const total = cartItems.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 1)), 0);
  const subtotal = total / 1.16;
  const iva = total - subtotal;

  const handleSendSummary = () => {
    if (cartItems.length === 0) return;
    
    let text = '🧾 *RESUMEN DE COTIZACIÓN*\n';
    cartItems.forEach(item => {
      text += `🔹 ${item.cantidad}x ${item.clave}\n`;
    });
    text += `\n*Total Neto:* ${total.toFixed(2)}`;

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
  };

  const handleDownloadPDF = async () => {
    Toast.show({ type: 'info', text1: 'Cotización PDF', text2: 'Próximamente disponible en la app.' });
  };

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [tempBilling, setTempBilling] = useState({ razonSocial: '', rfc: '', billingAddress: '' });
  const [isSearchingRfc, setIsSearchingRfc] = useState(false);

  // Update effect to populate default values when opening edit mode
  React.useEffect(() => {
    if (visible) {
      setTempAddress(shippingAddress || '');
      setTempBilling({
        razonSocial: razonSocial || '',
        rfc: rfc || '',
        billingAddress: billingAddress || ''
      });
      setIsEditingAddress(false);
      setIsEditingBilling(false);
    }
  }, [visible]);

  const handleSearchRfc = async () => {
    if (!tempBilling.rfc) return;
    setIsSearchingRfc(true);
    try {
      const res = await get(`/sealmarket/clientes/rfc/${tempBilling.rfc}`);
      if (!res.ok) throw new Error('RFC no encontrado');
      const response = await res.json();
      const cliente = Array.isArray(response.data) ? response.data[0] : response.data;
      if (cliente) {
        const calle = cliente.CALLE || '';
        const num = cliente.NUMEXT || '';
        const col = cliente.COLONIA ? `Col. ${cliente.COLONIA}` : '';
        const cp = cliente.CODIGO ? `C.P. ${cliente.CODIGO}` : '';
        const mun = cliente.MUNICIPIO || '';
        const est = cliente.ESTADO || '';
        const direccion = `${calle} ${num}, ${col}, ${cp}, ${mun}, ${est}`.trim().replace(/,\s*,/g, ',');

        setTempBilling(prev => ({
          ...prev,
          razonSocial: cliente.NOMBRE || prev.razonSocial,
          billingAddress: direccion || prev.billingAddress,
          rfc: cliente.RFC || prev.rfc
        }));
        Toast.show({ type: 'success', text1: 'Datos fiscales encontrados' });
      } else {
        Toast.show({ type: 'error', text1: 'RFC no encontrado' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error al buscar RFC' });
    } finally {
      setIsSearchingRfc(false);
    }
  };

  const saveCartData = async () => {
    try {
      const newCartData = {
        ...cartData,
        items: cartItems,
        razonSocial: tempBilling.razonSocial,
        rfc: tempBilling.rfc,
        billingAddress: tempBilling.billingAddress,
        shippingAddress: tempAddress
      };
      await patch(`/clients/${chat.client.id}/cart`, { cartData: newCartData });
      updateChat(chat.id, {
        client: { ...chat.client, cartData: newCartData }
      });
      return true;
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error al guardar datos' });
      return false;
    }
  };

  const handleSaveBilling = async () => {
    const success = await saveCartData();
    if (success) {
      setIsEditingBilling(false);
      Toast.show({ type: 'success', text1: 'Datos fiscales guardados' });
    }
  };

  const handleSaveAddress = async () => {
    const success = await saveCartData();
    if (success) {
      setIsEditingAddress(false);
      Toast.show({ type: 'success', text1: 'Dirección guardada' });
    }
  };

  const askBillingValidation = () => {
    sendMessage(`Por favor valida tus datos de facturación:\n\nRazón Social: ${tempBilling.razonSocial}\nRFC: ${tempBilling.rfc}\nDirección: ${tempBilling.billingAddress}\n\n¿Son correctos?`, false);
    onClose();
  };

  const askAddressValidation = () => {
    sendMessage(`Por favor valida tu dirección de envío:\n\n*${tempAddress}*\n\n¿Es correcta?`, false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Carrito y Cotización</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#94a3b8" size={24} />
            </TouchableOpacity>
          </View>

          {/* Segmented Control */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'current' && styles.tabBtnActive]} 
              onPress={() => setActiveTab('current')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'current' && styles.tabBtnTextActive]}>Carrito Actual</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'catalog' && styles.tabBtnActive]} 
              onPress={() => setActiveTab('catalog')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'catalog' && styles.tabBtnTextActive]}>Catálogo</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'current' ? (
            <ScrollView style={styles.scrollContent}>
              {/* Client Info Section */}
            <View style={styles.section}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                <Text style={styles.sectionTitle}>Datos del Cliente</Text>
              </View>
              <Text style={styles.textRow}><Text style={styles.bold}>Nombre:</Text> {clientName}</Text>
              <Text style={styles.textRow}><Text style={styles.bold}>Teléfono:</Text> {clientPhone}</Text>
              
              <View style={styles.billingCard}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                  <Text style={styles.bold}>Facturación</Text>
                  {!isEditingBilling ? (
                    <TouchableOpacity onPress={() => setIsEditingBilling(true)}><Text style={{color: '#06b6d4', fontSize: 12}}>Editar</Text></TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleSaveBilling}><Text style={{color: '#10b981', fontSize: 12}}>Guardar</Text></TouchableOpacity>
                  )}
                </View>
                
                {isEditingBilling ? (
                  <View>
                    <TextInput style={styles.input} value={tempBilling.razonSocial} onChangeText={t => setTempBilling({...tempBilling, razonSocial: t})} placeholder="Razón Social" placeholderTextColor="#64748b" />
                    <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
                      <TextInput style={[styles.input, {flex: 1, marginBottom: 0}]} value={tempBilling.rfc} onChangeText={t => setTempBilling({...tempBilling, rfc: t})} placeholder="RFC" placeholderTextColor="#64748b" />
                      <TouchableOpacity onPress={handleSearchRfc} disabled={!tempBilling.rfc || isSearchingRfc} style={styles.searchBtn}>
                        {isSearchingRfc ? <ActivityIndicator size="small" color="#fff" /> : <Search size={16} color="#fff" />}
                      </TouchableOpacity>
                    </View>
                    <TextInput style={styles.input} value={tempBilling.billingAddress} onChangeText={t => setTempBilling({...tempBilling, billingAddress: t})} placeholder="Dirección Fiscal" placeholderTextColor="#64748b" />
                    <TouchableOpacity onPress={askBillingValidation} style={styles.validateBtn}><Send size={14} color="#fff" /><Text style={styles.validateBtnText}>Validar en Chat</Text></TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {tempBilling.razonSocial ? <Text style={styles.textRow}><Text style={styles.bold}>Razón Social:</Text> {tempBilling.razonSocial}</Text> : null}
                    {tempBilling.rfc ? <Text style={styles.textRow}><Text style={styles.bold}>RFC:</Text> {tempBilling.rfc}</Text> : null}
                    {tempBilling.billingAddress ? <Text style={styles.textRow}><Text style={styles.bold}>Dirección Fisc.:</Text> {tempBilling.billingAddress}</Text> : null}
                    {(!tempBilling.razonSocial && !tempBilling.rfc && !tempBilling.billingAddress) && <Text style={styles.emptyText}>No especificados</Text>}
                  </View>
                )}
              </View>

              <View style={styles.shippingCard}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                  <Text style={styles.bold}>Envío</Text>
                  {!isEditingAddress ? (
                    <TouchableOpacity onPress={() => setIsEditingAddress(true)}><Text style={{color: '#06b6d4', fontSize: 12}}>Editar</Text></TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleSaveAddress}><Text style={{color: '#10b981', fontSize: 12}}>Guardar</Text></TouchableOpacity>
                  )}
                </View>
                {isEditingAddress ? (
                  <View>
                    <TextInput style={styles.input} value={tempAddress} onChangeText={setTempAddress} placeholder="Dirección de envío completa" placeholderTextColor="#64748b" multiline />
                    <TouchableOpacity onPress={askAddressValidation} style={styles.validateBtn}><Send size={14} color="#fff" /><Text style={styles.validateBtnText}>Validar en Chat</Text></TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {tempAddress ? <Text style={styles.textRow}>{tempAddress}</Text> : <Text style={styles.emptyText}>No especificada</Text>}
                  </View>
                )}
              </View>
            </View>

            {/* Cart Items Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Partidas del Carrito</Text>
              {cartItems.length === 0 ? (
                <Text style={styles.emptyText}>El carrito está vacío</Text>
              ) : (
                cartItems.map((item, idx) => {
                  const lineTotal = (item.precio || 0) * (item.cantidad || 1);
                  return (
                    <View key={idx} style={styles.cartItem}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemClave}>{item.cantidad}x {item.clave}</Text>
                        <Text style={styles.itemTotal}>${lineTotal.toFixed(2)}</Text>
                      </View>
                      <Text style={styles.itemDesc}>{item.descripcion}</Text>
                      <Text style={styles.itemPrice}>${(item.precio || 0).toFixed(2)} c/u</Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* Totals Section */}
            {cartItems.length > 0 && (
              <View style={styles.totalsSection}>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal:</Text><Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text></View>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>IVA (16%):</Text><Text style={styles.totalValue}>${iva.toFixed(2)}</Text></View>
                <View style={[styles.totalRow, styles.grandTotalRow]}><Text style={styles.grandTotalLabel}>Total Neto:</Text><Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text></View>
              </View>
            )}
            </ScrollView>
          ) : (
            <View style={styles.catalogContainer}>
              <View style={[styles.searchSection, {flexDirection: 'column', gap: 8}]}>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <TouchableOpacity 
                    style={[styles.catalogSearchInput, {flex: 1, padding: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: searchForm.sist_med === 'std' ? '#06b6d4' : '#1e293b'}]}
                    onPress={() => setSearchForm({ ...searchForm, sist_med: 'std' })}
                  >
                    <Text style={{color: searchForm.sist_med === 'std' ? '#fff' : '#94a3b8', fontWeight: 'bold', fontSize: 12}}>STD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.catalogSearchInput, {flex: 1, padding: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: searchForm.sist_med === 'mm' ? '#06b6d4' : '#1e293b'}]}
                    onPress={() => setSearchForm({ ...searchForm, sist_med: 'mm' })}
                  >
                    <Text style={{color: searchForm.sist_med === 'mm' ? '#fff' : '#94a3b8', fontWeight: 'bold', fontSize: 12}}>MM</Text>
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
              </View>
              
              <View style={styles.chipsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {familias.map((f, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.chip, searchForm.familia === f.FAMILIA && styles.chipActive]}
                      onPress={() => setSearchForm({ ...searchForm, familia: f.FAMILIA })}
                    >
                      <Text style={[styles.chipText, searchForm.familia === f.FAMILIA && styles.chipTextActive]}>
                        {f.FAMILIA || 'Todas'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {isSearchingCatalog ? (
                <View style={styles.centerLoad}><ActivityIndicator size="large" color="#3b82f6" /></View>
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item, index) => `${item.CVE_ART}-${index}`}
                  contentContainerStyle={[styles.catalogList, { paddingBottom: insets.bottom + 20 }]}
                  ListEmptyComponent={<Text style={styles.emptyText}>No hay resultados</Text>}
                  renderItem={({ item }) => {
                    const priceNet = ((item.PRECIO || 0) * 1.16).toFixed(2);
                    return (
                      <View style={styles.catalogItem}>
                        <View style={styles.catalogItemHeader}>
                          <Package size={16} color="#3b82f6" />
                          <Text style={styles.catalogItemClave}>{item.CVE_ART}</Text>
                        </View>
                        <Text style={styles.catalogItemDesc}>{item.DESC_ECOMM || item.DESCR || item.NOMBRE}</Text>
                        <Text style={styles.catalogItemPrice}>${priceNet} <Text style={styles.catalogItemTax}>Neto (IVA Inc.)</Text></Text>
                        
                        <View style={styles.catalogItemActions}>
                          <TouchableOpacity style={styles.btnSuggest} onPress={() => handleSuggestProduct(item)}>
                            <MessageSquare size={14} color="#94a3b8" />
                            <Text style={styles.btnSuggestText}>Sugerir</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.btnInject} onPress={() => handleInjectProduct(item)}>
                            <ShoppingCartIcon size={14} color="#fff" />
                            <Text style={styles.btnInjectText}>Añadir</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          )}

          {activeTab === 'current' && (
            <View style={[styles.footerActions, { paddingBottom: insets.bottom + 25 }]}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.btnSummary, cartItems.length === 0 && styles.btnDisabled]} 
                disabled={cartItems.length === 0}
                onPress={handleSendSummary}
              >
              <Send size={18} color="#06b6d4" />
              <Text style={styles.btnSummaryText}>Resumen a Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnPdf, cartItems.length === 0 && styles.btnDisabled]} 
              disabled={cartItems.length === 0}
              onPress={handleDownloadPDF}
            >
              <Download size={18} color="#ffffff" />
              <Text style={styles.btnPdfText}>Cotización PDF</Text>
            </TouchableOpacity>
          </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 5,
  },
  scrollContent: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#06b6d4',
    marginBottom: 10,
  },
  textRow: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
    color: '#f8fafc',
  },
  billingCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  shippingCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 8,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  cartItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemClave: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 15,
  },
  itemTotal: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 15,
  },
  itemDesc: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 4,
  },
  itemPrice: {
    color: '#94a3b8',
    fontSize: 13,
  },
  totalsSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  totalValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
  },
  grandTotalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  grandTotalLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  btnSummary: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSummaryText: {
    color: '#06b6d4',
    fontWeight: '600',
  },
  btnPdf: {
    backgroundColor: '#0284c7', // sales-blue-600
  },
  btnPdfText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  input: {
    backgroundColor: '#1e293b',
    color: 'white',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  validateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 5,
    gap: 5,
  },
  validateBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchBtn: {
    backgroundColor: '#0284c7',
    width: 44,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#38bdf8',
    backgroundColor: '#1e293b',
  },
  tabBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  catalogContainer: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
    backgroundColor: '#0f172a',
  },
  catalogSearchInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catalogSearchBtn: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  centerLoad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catalogList: {
    padding: 10,
  },
  catalogItem: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catalogItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  catalogItemClave: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 13,
  },
  catalogItemDesc: {
    color: '#e2e8f0',
    fontSize: 13,
    marginBottom: 6,
  },
  catalogItemPrice: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 10,
  },
  catalogItemTax: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'normal',
  },
  catalogItemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btnSuggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnSuggestText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  btnInject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0284c7',
    borderRadius: 6,
  },
  btnInjectText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  }
});
