import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Info, Plus, Minus, Trash2, Trash, Search, Database, Loader2, ArrowRight, Filter, Send, MessageSquare, X } from 'lucide-react';
import { updateClientCart, searchSealMarketCatalog, getSealMarketFamilias, getClientByRfc } from '../../../services/api';
import useChatStore from '../../../stores/useChatStore';
import useAuthStore from '../../../stores/useAuthStore';
import ConfirmModal from '../../../components/ConfirmModal.jsx';

export default function CartViewer({ cartData, client, onClose }) {
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'catalog'
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, idx: null });
  const { sendMessage } = useChatStore();

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState('');

  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [tempBilling, setTempBilling] = useState({ razonSocial: '', rfc: '', billingAddress: '' });
  const [isSearchingRfc, setIsSearchingRfc] = useState(false);

  // Catalog state
  const [familias, setFamilias] = useState([]);
  const [searchForm, setSearchForm] = useState({
    familia: '',
    sist_med: 'std',
    diam_int: '',
    diam_ext: '',
    altura: '',
    seccion: '',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    if (activeTab === 'catalog' && familias.length === 0) {
      getSealMarketFamilias()
        .then(data => setFamilias(data))
        .catch(err => console.error('Error al cargar familias:', err));
    }
  }, [activeTab, familias.length]);

  let cartItems = [];
  let shippingAddress = null;
  let razonSocial = null;
  let rfc = null;
  let billingAddress = null;

  if (Array.isArray(cartData)) {
    cartItems = cartData;
  } else if (cartData && cartData.items) {
    cartItems = cartData.items;
    shippingAddress = cartData.shippingAddress;
    razonSocial = cartData.razonSocial;
    rfc = cartData.rfc || cartData.RFC;
    billingAddress = cartData.billingAddress || cartData.domicilioFiscal;
  }

  // Define update helper
  const saveCart = async (newItems) => {
    if (!client?.id) return;
    setIsUpdating(true);
    try {
      const newCartData = {
        items: newItems,
        shippingAddress,
        razonSocial,
        rfc,
        billingAddress,
      };
      await updateClientCart(client.id, newCartData);
    } catch (err) {
      console.error('Failed to update cart', err);
      alert('Error al actualizar carrito');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAddress = async (validate = false) => {
    if (!client?.id) return;
    setIsUpdating(true);
    try {
      const newCartData = {
        items: cartItems,
        shippingAddress: tempAddress,
        razonSocial,
        rfc,
        billingAddress,
      };
      await updateClientCart(client.id, newCartData);
      setIsEditingAddress(false);

      if (validate && tempAddress) {
        sendMessage(`Por favor valida tu dirección de envío:\n\n*${tempAddress}*\n\n¿Es correcta?`, false);
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar dirección');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveBilling = async (validate = false) => {
    if (!client?.id) return;
    setIsUpdating(true);
    try {
      const newCartData = {
        items: cartItems,
        shippingAddress,
        razonSocial: tempBilling.razonSocial,
        rfc: tempBilling.rfc,
        billingAddress: tempBilling.billingAddress,
      };
      await updateClientCart(client.id, newCartData);
      setIsEditingBilling(false);

      if (validate) {
        sendMessage(`Por favor valida tus datos de facturación:\n\nRazón Social: *${tempBilling.razonSocial || '-'}*\nRFC: *${tempBilling.rfc || '-'}*\nDomicilio: *${tempBilling.billingAddress || '-'}*\n\n¿Son correctos?`, false);
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar datos de facturación');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSearchRfc = async () => {
    if (!tempBilling.rfc) return;
    setIsSearchingRfc(true);
    try {
      const response = await getClientByRfc(tempBilling.rfc);
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
      } else {
        alert("El RFC no fue encontrado en la base de datos.");
      }
    } catch (err) {
      alert(err.message || 'Error al consultar el RFC');
    } finally {
      setIsSearchingRfc(false);
    }
  };

  const handleUpdateQuantity = (idx, delta) => {
    const newItems = [...cartItems];
    const item = newItems[idx];
    const newQty = (item.cantidad || 1) + delta;
    if (newQty < 1) return;
    item.cantidad = newQty;
    saveCart(newItems);
  };

  const handleRemoveItem = (idx) => {
    setConfirmModal({ open: true, type: 'REMOVE', idx });
  };

  const handleClearCart = () => {
    setConfirmModal({ open: true, type: 'CLEAR', idx: null });
  };

  const executeConfirm = () => {
    if (confirmModal.type === 'REMOVE') {
      const newItems = cartItems.filter((_, i) => i !== confirmModal.idx);
      saveCart(newItems);
    } else if (confirmModal.type === 'CLEAR') {
      saveCart([]);
    }
    setConfirmModal({ open: false, type: null, idx: null });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchForm.familia) {
      setSearchError('Por favor selecciona una familia principal.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await searchSealMarketCatalog(searchForm);
      setSearchResults(res.data || []);
    } catch (err) {
      setSearchError(err.message || 'Error buscando en el catálogo');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInjectProduct = (product) => {
    const newItems = [...cartItems];
    const desc = product.DESC_ECOMM || product.DESCR || product.NOMBRE;
    // Check if already in cart
    const existingIdx = newItems.findIndex(i => i.clave === product.CVE_ART);
    if (existingIdx >= 0) {
      newItems[existingIdx].cantidad = (newItems[existingIdx].cantidad || 1) + 1;
    } else {
      newItems.push({
        clave: product.CVE_ART,
        descripcion: desc,
        precio: (product.PRECIO || 0) * 1.16, // Guardamos el precio Neto
        cantidad: 1,
      });
    }
    saveCart(newItems);

    // Send auto-confirmation message to chat
    const priceNet = ((product.PRECIO || 0) * 1.16).toFixed(2);
    sendMessage(`✅ *Agregado al carrito:*\n1x ${product.CVE_ART} - ${desc}\nPrecio: $${priceNet} Neto (IVA Incluido)`, false);

    // Optional: Auto-switch back to cart to show the added item
    setActiveTab('current');
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

    useChatStore.getState().sendMessage('', false, 'PRODUCT_CARD', metadata);
  };

  const handleSendSummary = () => {
    if (cartItems.length === 0) return;
    
    let text = '🛒 *RESUMEN DE COTIZACIÓN*\n';
    cartItems.forEach(item => {
      text += `▫️ ${item.cantidad}x ${item.clave}\n`;
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

    sendMessage(text, false, 'CART_SUMMARY', metadata);
  };

  // Calculate totals for current cart
  const total = cartItems.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 1)), 0);
  const subtotal = total / 1.16;
  const iva = total - subtotal;

  return (
    <div className={`flex flex-col h-full bg-sales-slate-900/95 overflow-hidden rounded-l-2xl shadow-2xl border-l border-sales-slate-700/50 transition-opacity ${isUpdating ? 'opacity-70 pointer-events-none' : ''}`}>

      {/* Header & Tabs */}
      <div className="p-0 border-b border-sales-slate-700/50 bg-sales-slate-800/80 shrink-0 relative">
        <button
          onClick={onClose}
          className="absolute top-3 left-4 z-10 p-2 bg-sales-slate-700/50 hover:bg-sales-slate-600 text-sales-slate-300 hover:text-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 pl-12">
            <ShoppingCart className="text-sales-blue-400" />
            Venta Activa
          </h2>
          <div className="flex items-center gap-3">
            <span className="bg-sales-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              {cartItems.length} {cartItems.length === 1 ? 'art' : 'arts'}
            </span>
            <button
              onClick={handleClearCart}
              title="Vaciar carrito"
              className="text-sales-slate-400 hover:text-red-400 transition-colors p-1"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-sales-slate-700/30">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'current' ? 'text-sales-blue-400 border-b-2 border-sales-blue-500 bg-sales-slate-800' : 'text-sales-slate-400 hover:text-sales-slate-300'}`}
          >
            Carrito Actual
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'catalog' ? 'text-sales-blue-400 border-b-2 border-sales-blue-500 bg-sales-slate-800' : 'text-sales-slate-400 hover:text-sales-slate-300'}`}
          >
            Catálogo Integrado
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'current' ? (
          /* ================= CURRENT CART TAB ================= */
          <>
            {client?.name && (
              <div className="mb-4 p-3 bg-sales-slate-800/50 rounded-lg border border-sales-slate-700/50">
                <h3 className="text-sm font-semibold text-sales-slate-300 mb-1 flex items-center gap-2">
                  <Info className="text-sales-blue-400 w-4 h-4" /> Datos del Cliente
                </h3>
                <p className="text-sm text-sales-slate-100 font-medium truncate">{client.name}</p>
                {client.phone && <p className="text-xs text-sales-slate-400 mt-1">{client.phone}</p>}

                <div className="mt-2 pt-2 border-t border-sales-slate-700/50">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-sales-slate-400">Datos de Facturación:</p>
                    {!isEditingBilling && (
                      <button
                        onClick={() => {
                          setTempBilling({ razonSocial: razonSocial || '', rfc: rfc || '', billingAddress: billingAddress || '' });
                          setIsEditingBilling(true);
                        }}
                        className="text-[10px] text-sales-blue-400 hover:underline"
                      >
                        Editar
                      </button>
                    )}
                  </div>

                  {isEditingBilling ? (
                    <div className="mt-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-xs rounded-lg p-2 focus:ring-sales-blue-500 min-h-[30px]"
                          value={tempBilling.rfc}
                          onChange={(e) => setTempBilling({...tempBilling, rfc: e.target.value})}
                          placeholder="RFC"
                        />
                        <button
                          onClick={handleSearchRfc}
                          disabled={!tempBilling.rfc || isSearchingRfc}
                          className="bg-sales-blue-600 hover:bg-sales-blue-500 text-white text-[10px] px-2 py-1 rounded disabled:opacity-50 flex items-center justify-center gap-1 min-w-[70px]"
                          title="Buscar datos fiscales del cliente por RFC"
                        >
                          {isSearchingRfc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                          Buscar
                        </button>
                      </div>
                      <input
                        className="w-full bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-xs rounded-lg p-2 focus:ring-sales-blue-500 min-h-[30px]"
                        value={tempBilling.razonSocial}
                        onChange={(e) => setTempBilling({...tempBilling, razonSocial: e.target.value})}
                        placeholder="Razón Social"
                      />
                      <textarea
                        className="w-full bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-xs rounded-lg p-2 focus:ring-sales-blue-500 min-h-[50px]"
                        value={tempBilling.billingAddress}
                        onChange={(e) => setTempBilling({...tempBilling, billingAddress: e.target.value})}
                        placeholder="Domicilio Fiscal"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveBilling(false)}
                          className="flex-1 bg-sales-slate-700 hover:bg-sales-slate-600 text-white text-[10px] py-1 rounded"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => handleSaveBilling(true)}
                          className="flex-1 bg-sales-blue-600 hover:bg-sales-blue-500 text-white text-[10px] py-1 rounded flex items-center justify-center gap-1"
                          disabled={!tempBilling.razonSocial && !tempBilling.rfc}
                        >
                          <Send className="w-3 h-3" /> Validar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 mt-1">
                      {razonSocial || rfc || billingAddress ? (
                        <>
                          {razonSocial && <p className="text-xs text-sales-slate-300"><strong>Nombre:</strong> {razonSocial}</p>}
                          {rfc && <p className="text-xs text-sales-slate-300"><strong>RFC:</strong> {rfc}</p>}
                          {billingAddress && <p className="text-xs text-sales-slate-300"><strong>Dom:</strong> {billingAddress}</p>}
                        </>
                      ) : (
                        <p className="text-xs text-sales-slate-300 italic opacity-50">No especificados</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-sales-slate-700/50">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-sales-slate-400">Dirección de Envío:</p>
                    {!isEditingAddress && (
                      <button
                        onClick={() => { setTempAddress(shippingAddress || ''); setIsEditingAddress(true); }}
                        className="text-[10px] text-sales-blue-400 hover:underline"
                      >
                        Editar
                      </button>
                    )}
                  </div>

                  {isEditingAddress ? (
                    <div className="mt-1">
                      <textarea
                        className="w-full bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-xs rounded-lg p-2 focus:ring-sales-blue-500 focus:border-sales-blue-500 min-h-[60px]"
                        value={tempAddress}
                        onChange={(e) => setTempAddress(e.target.value)}
                        placeholder="Escribe la dirección..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveAddress(false)}
                          className="flex-1 bg-sales-slate-700 hover:bg-sales-slate-600 text-white text-[10px] py-1 rounded"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => handleSaveAddress(true)}
                          className="flex-1 bg-sales-blue-600 hover:bg-sales-blue-500 text-white text-[10px] py-1 rounded flex items-center justify-center gap-1"
                          disabled={!tempAddress}
                        >
                          <Send className="w-3 h-3" /> Validar en Chat
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start mt-1">
                      <p className="text-xs text-sales-slate-300 flex-1 pr-2">
                        {shippingAddress ? shippingAddress : <span className="italic opacity-50">No especificada</span>}
                      </p>
                      {shippingAddress && (
                        <button
                          onClick={() => sendMessage(`Por favor valida tu dirección de envío:\n\n*${shippingAddress}*\n\n¿Es correcta?`, false)}
                          className="flex-shrink-0 bg-sales-slate-700/50 hover:bg-sales-blue-600 hover:text-white text-sales-blue-400 text-[10px] py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors border border-sales-slate-600/50 hover:border-sales-blue-500"
                          title="Pedir validación en el chat"
                        >
                          <Send className="w-3 h-3" /> Validar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!cartItems || cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-sales-slate-500 h-64">
                <ShoppingCart className="w-12 h-12 mb-3 text-sales-slate-600" />
                <p>El carrito está vacío</p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="mt-4 text-sales-blue-400 text-sm hover:underline"
                >
                  Buscar productos
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="bg-sales-slate-800/40 rounded-lg p-3 border border-sales-slate-700/30 hover:border-sales-slate-600/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-sales-slate-700 text-sales-slate-200 mb-1">
                          {item.clave}
                        </span>
                        <p className="text-sm text-sales-slate-300 leading-snug line-clamp-2" title={item.descripcion}>
                          {item.descripcion}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-sales-slate-500 hover:text-red-400 p-1 bg-sales-slate-800/50 rounded-md transition-colors shrink-0"
                        title="Eliminar artículo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-sales-slate-700/50">
                      <div className="flex items-center gap-1 bg-sales-slate-900/50 rounded-lg p-0.5 border border-sales-slate-700/50">
                        <button
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          disabled={item.cantidad <= 1}
                          className="p-1 text-sales-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-sales-slate-400 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-medium text-sales-blue-400 w-6 text-center font-mono">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="p-1 text-sales-slate-400 hover:text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-sales-slate-100">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ================= CATALOG SEARCH TAB ================= */
          <div className="flex flex-col h-full">
            <form onSubmit={handleSearch} className="mb-4 bg-sales-slate-800/50 p-3 rounded-lg border border-sales-slate-700/50 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-sales-slate-400 mb-1">Familia *</label>
                <select
                  value={searchForm.familia}
                  onChange={(e) => setSearchForm({...searchForm, familia: e.target.value})}
                  className="w-full bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-sm rounded-lg focus:ring-sales-blue-500 focus:border-sales-blue-500 block p-2"
                >
                  <option value="">-- Seleccionar Familia --</option>
                  {familias.map((f, i) => (
                    <option key={i} value={f.FAMILIA}>{f.FAMILIA}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-sales-slate-400 mb-1">Sistema Medición</label>
                  <select
                    value={searchForm.sist_med}
                    onChange={(e) => setSearchForm({...searchForm, sist_med: e.target.value})}
                    className="w-full bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-sm rounded-lg focus:ring-sales-blue-500 focus:border-sales-blue-500 block p-2"
                  >
                    <option value="std">STD (Pulgadas)</option>
                    <option value="mm">Milímetros (mm)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-sales-slate-400 mb-1">Diam. Interior</label>
                  <input
                    type="text"
                    value={searchForm.diam_int}
                    onChange={(e) => setSearchForm({...searchForm, diam_int: e.target.value})}
                    placeholder="Ej. 1.25"
                    className="w-full bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-sm rounded-lg focus:ring-sales-blue-500 focus:border-sales-blue-500 block p-2"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-sales-slate-400 mb-1">Diam. Exterior</label>
                  <input
                    type="text"
                    value={searchForm.diam_ext}
                    onChange={(e) => setSearchForm({...searchForm, diam_ext: e.target.value})}
                    placeholder="Ej. 2.5"
                    className="w-full bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-sm rounded-lg focus:ring-sales-blue-500 focus:border-sales-blue-500 block p-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-sales-slate-400 mb-1">Altura</label>
                  <input
                    type="text"
                    value={searchForm.altura}
                    onChange={(e) => setSearchForm({...searchForm, altura: e.target.value})}
                    placeholder="Ej. 0.25"
                    className="w-full bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-sm rounded-lg focus:ring-sales-blue-500 focus:border-sales-blue-500 block p-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-sales-slate-400 mb-1">Sección</label>
                  <input
                    type="text"
                    value={searchForm.seccion}
                    onChange={(e) => setSearchForm({...searchForm, seccion: e.target.value})}
                    placeholder="Ej. 139"
                    className="w-full bg-sales-slate-900 border border-sales-slate-700 text-sales-slate-200 text-sm rounded-lg focus:ring-sales-blue-500 focus:border-sales-blue-500 block p-2"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching || !searchForm.familia}
                className="w-full bg-sales-blue-600 hover:bg-sales-blue-500 text-white font-medium rounded-lg text-sm px-4 py-2 mt-2 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                Filtrar Catálogo
              </button>
            </form>

            {searchError && (
              <div className="p-3 mb-4 text-sm text-red-400 bg-red-900/20 rounded-lg border border-red-900/50">
                {searchError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {!isSearching && searchResults.length === 0 && searchForm.familia && !searchError && (
                <div className="text-center text-sales-slate-500 mt-10">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aplica filtros para ver resultados.</p>
                </div>
              )}

              {searchResults.map((product, idx) => {
                const totalExt = Object.values(product.existencias || {}).reduce((a, b) => a + (b || 0), 0);
                return (
                  <div key={idx} className="bg-sales-slate-800/40 rounded-lg p-3 border border-sales-slate-700/30 hover:border-sales-slate-600/50 transition-colors">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-sales-slate-700 text-sales-slate-200 mb-1">
                          {product.CVE_ART}
                        </span>
                        <p className="text-sm text-sales-slate-300 leading-snug line-clamp-2" title={product.DESC_ECOMM || product.DESCR || product.NOMBRE}>
                          {product.DESC_ECOMM || product.DESCR || product.NOMBRE}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-sales-slate-700/50">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-sales-slate-100">
                          ${((product.PRECIO || 0) * 1.16).toFixed(2)} <span className="text-[10px] font-normal text-sales-slate-400">Neto (IVA Inc.)</span>
                        </span>
                        <span className="text-xs text-sales-slate-400">
                          Stock: {totalExt > 0 ? <span className="text-green-400 font-bold">{totalExt}</span> : '0'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleSuggestProduct(product);
                          }}
                          className="flex items-center justify-center gap-1 bg-sales-slate-700/50 text-sales-slate-300 hover:bg-sales-slate-600 hover:text-white px-3 py-1 rounded-md text-[10px] font-semibold transition-colors border border-sales-slate-600"
                          title="Sugerir en el chat"
                        >
                          <MessageSquare className="w-3 h-3" /> Sugerir
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleInjectProduct(product);
                          }}
                          className="flex items-center justify-center gap-1 bg-sales-blue-600/20 text-sales-blue-400 hover:bg-sales-blue-600 hover:text-white px-3 py-1 rounded-md text-[10px] font-semibold transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3" /> Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'current' && (
        <div className="p-4 bg-sales-slate-900 border-t border-sales-slate-800 shrink-0">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-sales-slate-400">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-sales-slate-400">
              <span>IVA (16%)</span>
              <span>${iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-sales-slate-100 pt-2 border-t border-sales-slate-700/50">
              <span>Total (Neto)</span>
              <span className="text-sales-blue-400">${total.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-col">
            <div className="flex gap-2">
              <button
                className="flex-1 py-2.5 px-3 bg-sales-slate-800 hover:bg-sales-slate-700 border border-sales-slate-700 text-sales-blue-400 rounded-lg font-medium transition-colors shadow-lg flex justify-center items-center gap-2"
                onClick={handleSendSummary}
                disabled={cartItems.length === 0}
                title="Enviar resumen al chat"
              >
                <Send className="w-4 h-4" />
                Resumen a Chat
              </button>
              <button
                className="flex-1 py-2.5 px-3 bg-sales-blue-600 hover:bg-sales-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-sales-blue-900/20 flex justify-center items-center gap-2"
                onClick={async () => {
                  try {
                    const token = useAuthStore.getState().token;
                    const reqBody = {
                      conversationId: useChatStore.getState().currentConversationId,
                      client: {
                        name: razonSocial || client?.name || '',
                        chatName: client?.name || '',
                        rfc: rfc || '',
                        billingAddress: billingAddress || '',
                        address: shippingAddress || '',
                        phone: client?.phoneNumber || client?.phone || '',
                      },
                      cartItems: cartItems,
                    };
                    const res = await fetch('/api/chat/quote/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify(reqBody),
                    });
                    if (!res.ok) throw new Error('Falló al generar PDF');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `Cotizacion_${Date.now()}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Error:', error);
                    alert('Error al generar la cotización PDF');
                  }
                }}
              >
                Cotización PDF
              </button>
            </div>
            <button
              className="w-full py-2 px-3 bg-sales-slate-800 hover:bg-sales-slate-700 border border-sales-slate-700 text-sales-slate-300 rounded-lg font-medium transition-colors shadow-lg flex justify-center items-center gap-2 text-sm"
              onClick={async () => {
                const email = window.prompt('Ingrese el correo electrónico al que desea enviar la cotización:');
                if (!email) return;

                try {
                  const token = useAuthStore.getState().token;
                  const reqBody = {
                    email,
                    client: {
                      name: razonSocial || client?.name || '',
                      chatName: client?.name || '',
                      rfc: rfc || '',
                      billingAddress: billingAddress || '',
                      address: shippingAddress || '',
                      phone: client?.phoneNumber || client?.phone || '',
                    },
                    cartItems: cartItems,
                  };
                  const res = await fetch('/api/chat/quote/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(reqBody),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Error al enviar');
                  }
                  alert('Cotización enviada exitosamente por correo electrónico.');
                } catch (error) {
                  console.error('Error:', error);
                  alert('Error al enviar cotización por correo: ' + error.message);
                }
              }}
              disabled={cartItems.length === 0}
            >
              Enviar por Correo
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.type === 'CLEAR' ? 'Vaciar Carrito' : 'Eliminar Artículo'}
        message={confirmModal.type === 'CLEAR' ? '¿Estás seguro de vaciar todo el carrito?' : '¿Seguro que deseas eliminar este artículo del carrito?'}
        confirmText="Eliminar"
        onConfirm={executeConfirm}
        onCancel={() => setConfirmModal({ open: false, type: null, idx: null })}
      />
    </div>
  );
}
