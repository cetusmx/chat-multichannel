import React, { useEffect, useRef, useState } from 'react';
import { X, Calendar, User, Activity } from 'lucide-react';

export default function FiltersDrawer({ isOpen, onClose, currentFilters, onApply }) {
  const dialogRef = useRef(null);
  
  // Local state for the drawer before applying
  const [vendorId, setVendorId] = useState(currentFilters.vendorId || '');
  const [dateFrom, setDateFrom] = useState(currentFilters.dateFrom || '');
  const [dateTo, setDateTo] = useState(currentFilters.dateTo || '');
  const [status, setStatus] = useState(currentFilters.status || '');

  // Sync when opened
  useEffect(() => {
    if (isOpen) {
      setVendorId(currentFilters.vendorId || '');
      setDateFrom(currentFilters.dateFrom || '');
      setDateTo(currentFilters.dateTo || '');
      setStatus(currentFilters.status || '');
      
      document.body.style.overflow = 'hidden';
      if (dialogRef.current && !dialogRef.current.open) {
        dialogRef.current.showModal();
      }
    } else {
      document.body.style.overflow = '';
      if (dialogRef.current && dialogRef.current.open) {
        dialogRef.current.close();
      }
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, currentFilters]);

  const handleApply = (e) => {
    e.preventDefault();
    onApply({ vendorId, dateFrom, dateTo, status });
    onClose();
  };

  return (
    <dialog 
      ref={dialogRef}
      onCancel={onClose}
      className="fixed inset-y-0 right-0 w-80 h-full m-0 ml-auto bg-white shadow-2xl transform transition-transform duration-300 flex flex-col p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex"
    >
      <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Activity size={18} className="text-blue-600"/> Filtros de Búsqueda
        </h2>
        <button onClick={onClose} aria-label="Cerrar filtros" className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Asesor */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User size={16} /> Asesor (Vendor ID)
          </label>
          <input 
            type="text" 
            placeholder="Ej: uuid-del-vendedor"
            value={vendorId}
            onChange={e => setVendorId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>

        {/* Fechas */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar size={16} /> Rango de Fechas
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-gray-500">Desde</span>
              <input 
                type="date" 
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <span className="text-xs text-gray-500">Hasta</span>
              <input 
                type="date" 
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Estatus */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Activity size={16} /> Estatus del Chat
          </label>
          <select 
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
            <option value="">Cualquiera</option>
            <option value="OPEN">Abierto</option>
            <option value="CLOSED">Cerrado</option>
            <option value="PENDING">Pendiente</option>
          </select>
        </div>

      </form>

      <div className="p-5 border-t border-gray-200 bg-gray-50 flex gap-3">
        <button 
          type="button"
          onClick={() => {
            setVendorId('');
            setDateFrom('');
            setDateTo('');
            setStatus('');
          }}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Limpiar
        </button>
        <button 
          onClick={handleApply}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Aplicar Filtros
        </button>
      </div>
    </dialog>
  );
}
