import React from 'react';
import { X, Calendar, User, Activity, Filter } from 'lucide-react';

export default function FiltersSidebar({ isOpen, currentFilters, onApply, onClose, facets }) {
  if (!isOpen) return null;
  
  const asesores = facets?.asesores || [];
  const clientes = facets?.clientes || [];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col flex-shrink-0 transition-all duration-300">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Filter size={16} className="text-blue-600"/> Filtros
        </h2>
        <button onClick={onClose} aria-label="Cerrar filtros" className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors">
          <X size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Asesor */}
        {asesores.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1 mb-2">
              <User size={14} /> Asesores
            </label>
            <div className="space-y-1">
              {asesores.map(a => (
                <label key={a.id} className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={currentFilters.vendorId === a.id}
                    onChange={(e) => {
                      onApply({ ...currentFilters, vendorId: e.target.checked ? a.id : '' });
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 truncate" title={a.name}>{a.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{a.count}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Cliente */}
        {clientes.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1 mb-2">
              <User size={14} /> Clientes (Resultados)
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {clientes.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={currentFilters.clientId === c.id}
                    onChange={(e) => {
                      onApply({ ...currentFilters, clientId: e.target.checked ? c.id : '' });
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 truncate" title={c.name}>{c.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.count}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* RFC / Razón Social */}
        {facets?.rfcs?.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1 mb-2">
              <Activity size={14} /> RFC / Razón Social
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {facets.rfcs.map(r => (
                <label key={r.id} className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={currentFilters.rfc === r.id}
                    onChange={(e) => {
                      onApply({ ...currentFilters, rfc: e.target.checked ? r.id : '' });
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 truncate uppercase" title={r.name}>{r.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{r.count}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Fechas */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Calendar size={14} /> Fechas
          </label>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500 mb-1 block">Desde</span>
              <input 
                type="date" 
                value={currentFilters.dateFrom || ''}
                onChange={e => onApply({ ...currentFilters, dateFrom: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50"
              />
            </div>
            <div>
              <span className="text-xs text-gray-500 mb-1 block">Hasta</span>
              <input 
                type="date" 
                value={currentFilters.dateTo || ''}
                onChange={e => onApply({ ...currentFilters, dateTo: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50"
              />
            </div>
          </div>
        </div>

      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button 
          type="button"
          onClick={() => {
            onApply({ vendorId: '', clientId: '', dateFrom: '', dateTo: '', status: '' });
          }}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Limpiar Filtros
        </button>
      </div>
    </div>
  );
}
