import React, { useState } from 'react';
import { ShoppingCart, Package, Info, Plus, Minus, Trash2, Trash, Search, Database, Loader2, ArrowRight } from 'lucide-react';
import { updateClientCart, searchSealMarketCatalog } from '../../../services/api';

export default function CartViewer({ cartData, client }) {
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'catalog'
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Catalog state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);

  let cartItems = [];
  let shippingAddress = null;
  let razonSocial = null;

  if (Array.isArray(cartData)) {
    cartItems = cartData;
  } else if (cartData && cartData.items) {
    cartItems = cartData.items;
    shippingAddress = cartData.shippingAddress;
    razonSocial = cartData.razonSocial;
  }

  // Define update helper
  const saveCart = async (newItems) => {
    if (!client?.id) return;
    setIsUpdating(true);
    try {
      const newCartData = {
        items: newItems,
        shippingAddress,
        razonSocial
      };
      await updateClientCart(client.id, newCartData);
    } catch (err) {
      console.error('Failed to update cart', err);
      alert('Error al actualizar carrito');
    } finally {
      setIsUpdating(false);
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
    if (window.confirm('¿Eliminar este artículo del carrito?')) {
      const newItems = cartItems.filter((_, i) => i !== idx);
      saveCart(newItems);
    }
  };

  const handleClearCart = () => {
    if (window.confirm('¿Estás seguro de vaciar todo el carrito?')) {
      saveCart([]);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await searchSealMarketCatalog({ descripcion: searchQuery });
      setSearchResults(res.data || []);
    } catch (err) {
      setSearchError(err.message || 'Error buscando en el catálogo');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInjectProduct = (product) => {
    const newItems = [...cartItems];
    // Check if already in cart
    const existingIdx = newItems.findIndex(i => i.clave === product.CLAVE);
    if (existingIdx >= 0) {
      newItems[existingIdx].cantidad = (newItems[existingIdx].cantidad || 1) + 1;
    } else {
      newItems.push({
        clave: product.CLAVE,
        descripcion: product.DESCRIPCION || product.NOMBRE,
        precio: product.PRECIO || 0,
        cantidad: 1
      });
    }
    saveCart(newItems);
    // Optional: Auto-switch back to cart to show the added item
    setActiveTab('current');
  };

  // Calculate totals for current cart
  const total = cartItems.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 1)), 0);
  const subtotal = total / 1.16;
  const iva = total - subtotal;

  return (
    <div className={`flex flex-col h-full bg-sales-slate-900/95 overflow-hidden rounded-l-2xl shadow-2xl border-l border-sales-slate-700/50 transition-opacity ${isUpdating ? 'opacity-70 pointer-events-none' : ''}`}>
      
      {/* Header & Tabs */}
      <div className="p-0 border-b border-sales-slate-700/50 bg-sales-slate-800/80 shrink-0">
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
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
                
                {razonSocial && (
                  <div className="mt-2 pt-2 border-t border-sales-slate-700/50">
                    <p className="text-xs font-semibold text-sales-slate-400 mb-1">Razón Social (Facturación):</p>
                    <p className="text-xs text-sales-slate-300 line-clamp-2">{razonSocial}</p>
                  </div>
                )}
                
                {shippingAddress && (
                  <div className="mt-2 pt-2 border-t border-sales-slate-700/50">
                    <p className="text-xs font-semibold text-sales-slate-400 mb-1">Dirección de Envío:</p>
                    <p className="text-xs text-sales-slate-300 line-clamp-2">{shippingAddress}</p>
                  </div>
                )}
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
            <form onSubmit={handleSearch} className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-sales-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por descripción..."
                  className="w-full bg-sales-slate-800 border border-sales-slate-700 text-sales-slate-200 text-sm rounded-lg focus:ring-sales-blue-500 focus:border-sales-blue-500 block pl-9 p-2.5"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSearching}
                className="bg-sales-blue-600 hover:bg-sales-blue-500 text-white font-medium rounded-lg text-sm px-4 py-2 disabled:opacity-50 transition-colors"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
              </button>
            </form>

            {searchError && (
              <div className="p-3 mb-4 text-sm text-red-400 bg-red-900/20 rounded-lg border border-red-900/50">
                {searchError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {!isSearching && searchResults.length === 0 && searchQuery && !searchError && (
                <div className="text-center text-sales-slate-500 mt-10">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No se encontraron productos.</p>
                </div>
              )}
              
              {searchResults.map((product, idx) => {
                const totalExt = Object.values(product.existencias || {}).reduce((a, b) => a + (b || 0), 0);
                return (
                  <div key={idx} className="bg-sales-slate-800/40 rounded-lg p-3 border border-sales-slate-700/30 hover:border-sales-slate-600/50 transition-colors">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-sales-slate-700 text-sales-slate-200 mb-1">
                          {product.CLAVE}
                        </span>
                        <p className="text-sm text-sales-slate-300 leading-snug line-clamp-2" title={product.DESCRIPCION || product.NOMBRE}>
                          {product.DESCRIPCION || product.NOMBRE}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-sales-slate-700/50">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-sales-slate-100">
                          ${(product.PRECIO || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-sales-slate-400">
                          Stock: {totalExt > 0 ? <span className="text-green-400 font-bold">{totalExt}</span> : '0'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleInjectProduct(product)}
                        className="flex items-center gap-1 bg-sales-blue-600/20 text-sales-blue-400 hover:bg-sales-blue-600 hover:text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                      >
                        Añadir <ArrowRight className="w-3 h-3" />
                      </button>
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
          <button 
            className="w-full py-2.5 px-4 bg-sales-blue-600 hover:bg-sales-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-sales-blue-900/20 flex justify-center items-center gap-2"
            onClick={() => alert("Función de generar cotización PDF en desarrollo")}
          >
            Generar Cotización PDF
          </button>
        </div>
      )}
    </div>
  );
}
