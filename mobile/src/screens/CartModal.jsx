import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Send, Download, Search, MessageSquare, ShoppingCart as ShoppingCartIcon } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import useChatStore from '@shared/stores/useChatStore';
import { post, patch, searchCatalog, lookupCustomerByTaxId } from '../services/api';
import useCatalogStore from '../stores/useCatalogStore';
import CatalogSearchForm from '../components/CatalogSearchForm';
import CatalogProductRow from '../components/CatalogProductRow';
import { initialSearchValues, productToCartItem, productToCardMetadata } from '../utils/catalog';

export default function CartModal({ visible, onClose, chat }) {
  const insets = useSafeAreaInsets();
  const { sendMessage, updateChat } = useChatStore();

  // Tabs state
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'catalog'

  // Catalog State (schema-driven, provider-agnostic)
  const catalogStatus = useCatalogStore((s) => s.status);
  const catalogError = useCatalogStore((s) => s.error);
  const catalogIsConfigured = useCatalogStore((s) => s.isConfigured);
  const catalogSchema = useCatalogStore((s) => s.schema);
  const catalogPricing = useCatalogStore((s) => s.pricing);
  const loadCatalog = useCatalogStore((s) => s.load);
  const [searchForm, setSearchForm] = useState(() => initialSearchValues(catalogSchema));
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    if (visible) loadCatalog();
  }, [visible, loadCatalog]);

  useEffect(() => {
    setSearchForm(initialSearchValues(catalogSchema));
  }, [catalogSchema]);

  const handleSearchCatalog = async (values) => {
    setIsSearchingCatalog(true);
    setSearchError(null);
    try {
      const products = await searchCatalog(values, { limit: 50 });
      setSearchResults(products);
    } catch (err) {
      setSearchError(err.message || 'Error buscando en el catálogo');
      Toast.show({ type: 'error', text1: 'Error buscando en catálogo', text2: err.message });
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  const handleInjectProduct = async (product) => {
    const newItems = [...cartItems];
    const line = productToCartItem(product, 1);
    const existingIdx = newItems.findIndex(i => i.clave === line.clave);
    if (existingIdx >= 0) {
      newItems[existingIdx].cantidad = (newItems[existingIdx].cantidad || 1) + 1;
    } else {
      newItems.push(line);
    }

    // Save to server
    try {
      const newCartData = { ...cartData, items: newItems };
      await patch(`/clients/${chat.client.id}/cart`, { cartData: newCartData });
      updateChat(chat.id, { client: { ...chat.client, cartData: newCartData } });
      sendMessage(`✅ *Agregado al carrito:*\n1x ${line.clave} - ${line.descripcion}\nPrecio: $${line.precio.toFixed(2)} Neto (IVA Incluido)`, false);
      Toast.show({ type: 'success', text1: 'Artículo añadido al carrito' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al añadir artículo' });
    }
  };

  const handleSuggestProduct = (product) => {
    sendMessage('', false, 'PRODUCT_CARD', productToCardMetadata(product));
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
  } else if (cartData) {
    cartItems = cartData.items || [];
    shippingAddress = cartData.shippingAddress || '';
    razonSocial = cartData.razonSocial || '';
    rfc = cartData.rfc || cartData.RFC || '';
    billingAddress = cartData.billingAddress || cartData.domicilioFiscal || '';
  }

  const clientName = chat?.client?.name || '';
  const clientPhone = chat?.client?.phoneNumber || chat?.client?.phone || '';

  // Calculation: prices are stored net (IVA included), so the subtotal is derived from the total.
  const taxRate = catalogPricing?.taxRate ?? 0.16;
  const total = cartItems.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 1)), 0);
  const subtotal = total / (1 + taxRate);
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
    try {
      const reqBody = {
        conversationId: chat.id,
        client: {
          name: tempBilling.razonSocial || clientName || '',
          chatName: clientName || '',
          rfc: tempBilling.rfc || '',
          billingAddress: tempBilling.billingAddress || '',
          address: tempAddress || '',
          phone: clientPhone || '',
        },
        cartItems: cartItems,
      };
      const res = await post('/chat/quote/generate', reqBody);
      if (res.ok) {
        Toast.show({ type: 'success', text1: 'Cotización generada', text2: 'Se ha enviado el PDF al cliente' });
        onClose();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo generar la cotización' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Fallo al conectar con el servidor' });
    }
  };

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [tempBilling, setTempBilling] = useState({ razonSocial: '', rfc: '', billingAddress: '' });
  const [isSearchingRfc, setIsSearchingRfc] = useState(false);

  // Populate default values and leave edit mode only when the modal opens;
  // live cartData changes are synced by the effect below without resetting edit state.
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (visible && !isEditingBilling) {
      setTempBilling(prev => ({
        razonSocial: razonSocial || prev.razonSocial,
        rfc: rfc || prev.rfc,
        billingAddress: billingAddress || prev.billingAddress
      }));
    }
  }, [razonSocial, rfc, billingAddress, isEditingBilling, visible]);

  const handleSearchRfc = async () => {
    if (!tempBilling.rfc) return;
    setIsSearchingRfc(true);
    try {
      const customer = await lookupCustomerByTaxId(tempBilling.rfc);
      if (customer) {
        setTempBilling(prev => ({
          ...prev,
          razonSocial: customer.legalName || prev.razonSocial,
          billingAddress: customer.address || prev.billingAddress,
          rfc: customer.taxId || prev.rfc,
        }));
        if (customer.isActive === false) {
          Toast.show({ type: 'info', text1: 'Cliente inactivo', text2: 'El RFC existe pero el cliente no está activo en el sistema.' });
        } else {
          Toast.show({ type: 'success', text1: 'Datos fiscales encontrados' });
        }
      } else {
        Toast.show({ type: 'error', text1: 'RFC no encontrado' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error al buscar RFC', text2: err.message });
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
                <View style={styles.totalRow}><Text style={styles.totalLabel}>IVA ({Math.round(taxRate * 100)}%):</Text><Text style={styles.totalValue}>${iva.toFixed(2)}</Text></View>
                <View style={[styles.totalRow, styles.grandTotalRow]}><Text style={styles.grandTotalLabel}>Total Neto:</Text><Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text></View>
              </View>
            )}
            </ScrollView>
          ) : (
            <View style={styles.catalogContainer}>
              {catalogStatus === 'loading' || catalogStatus === 'idle' ? (
                <View style={styles.centerLoad}><ActivityIndicator size="large" color="#3b82f6" /></View>
              ) : catalogStatus === 'error' ? (
                <View style={styles.catalogNotice}>
                  <Text style={styles.catalogNoticeText}>{catalogError || 'No se pudo cargar el catálogo'}</Text>
                  <TouchableOpacity style={styles.catalogRetryBtn} onPress={() => loadCatalog({ force: true })}>
                    <Text style={styles.catalogRetryText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              ) : !catalogIsConfigured ? (
                <View style={styles.catalogNotice}>
                  <Text style={styles.catalogNoticeText}>El catálogo no está configurado para este tenant.</Text>
                </View>
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item, index) => `${item.sku}-${index}`}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={[styles.catalogList, { paddingBottom: insets.bottom + 20 }]}
                  ListHeaderComponent={
                    <View style={styles.searchSection}>
                      <CatalogSearchForm
                        values={searchForm}
                        onChange={setSearchForm}
                        onSubmit={handleSearchCatalog}
                        loading={isSearchingCatalog}
                        error={searchError}
                      />
                    </View>
                  }
                  ListEmptyComponent={
                    isSearchingCatalog
                      ? <View style={styles.centerLoad}><ActivityIndicator size="large" color="#3b82f6" /></View>
                      : <Text style={styles.emptyText}>No hay resultados</Text>
                  }
                  renderItem={({ item }) => (
                    <CatalogProductRow
                      product={item}
                      actions={
                        <>
                          <TouchableOpacity style={styles.btnSuggest} onPress={() => handleSuggestProduct(item)}>
                            <MessageSquare size={14} color="#94a3b8" />
                            <Text style={styles.btnSuggestText}>Sugerir</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.btnInject} onPress={() => handleInjectProduct(item)}>
                            <ShoppingCartIcon size={14} color="#fff" />
                            <Text style={styles.btnInjectText}>Añadir</Text>
                          </TouchableOpacity>
                        </>
                      }
                    />
                  )}
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
    paddingBottom: 12,
    backgroundColor: '#0f172a',
  },
  centerLoad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  catalogList: {
    padding: 10,
    flexGrow: 1,
  },
  catalogNotice: {
    margin: 15,
    padding: 15,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    gap: 10,
  },
  catalogNoticeText: {
    color: '#cbd5e1',
    fontSize: 13,
    textAlign: 'center',
  },
  catalogRetryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0284c7',
    borderRadius: 6,
  },
  catalogRetryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
