import React from 'react';
import { FiShoppingCart, FiPackage, FiInfo } from 'react-icons/fi';

export default function CartViewer({ cartData, client }) {
  if (!cartData || !Array.isArray(cartData) || cartData.length === 0) {
    return null;
  }

  // Calculate totals
  const subtotal = cartData.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 1)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return (
    <div className="w-80 h-full flex flex-col bg-sales-slate-900 border-l border-sales-slate-800 shadow-xl overflow-hidden shrink-0">
      <div className="p-4 bg-sales-slate-900/80 border-b border-sales-slate-800 flex items-center gap-2">
        <FiShoppingCart className="text-sales-blue-500 w-5 h-5" />
        <h2 className="text-lg font-bold text-sales-slate-100">Carrito Activo</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {client?.name && (
          <div className="mb-4 p-3 bg-sales-slate-800/50 rounded-lg border border-sales-slate-700/50">
            <h3 className="text-sm font-semibold text-sales-slate-300 mb-1 flex items-center gap-2">
              <FiInfo className="text-sales-blue-400" /> Datos del Cliente
            </h3>
            <p className="text-sm text-sales-slate-100 font-medium truncate">{client.name}</p>
            {client.phone && <p className="text-xs text-sales-slate-400 mt-1">{client.phone}</p>}
          </div>
        )}

        <div className="space-y-3">
          {cartData.map((item, idx) => (
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
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-sales-slate-700/50">
                <span className="text-xs font-medium bg-sales-blue-900/30 text-sales-blue-400 px-2 py-1 rounded-md flex items-center gap-1">
                  <FiPackage /> Cant: {item.cantidad}
                </span>
                <span className="text-sm font-bold text-sales-slate-100">
                  ${(item.precio * item.cantidad).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
            <span>Total</span>
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
    </div>
  );
}
