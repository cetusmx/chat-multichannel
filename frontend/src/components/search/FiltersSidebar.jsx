import React from 'react';
import { X, Calendar, User, Activity, Filter } from 'lucide-react';

export default function FiltersSidebar({ isOpen, currentFilters, onApply, onClose, facets }) {
  if (!isOpen) return null;
  
  const asesores = facets?.asesores || [];
  const clientes = facets?.clientes || [];

  return (
    <div className="w-64 bg-sales-slate-900/40 border-r border-sales-slate-800 h-full flex flex-col flex-shrink-0 transition-all duration-300 backdrop-blur-md shadow-lg z-10">
      <div className="flex justify-between items-center p-4 border-b border-sales-slate-800 bg-sales-slate-900/60">
        <h2 className="text-sm font-bold text-sales-slate-100 flex items-center gap-2">
          <Filter size={16} className="text-blue-500"/> Filtros
        </h2>
        <button onClick={onClose} aria-label="Cerrar filtros" className="p-1.5 text-sales-slate-400 hover:text-sales-slate-100 hover:bg-sales-slate-800 rounded-md transition-colors">
          <X size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Asesor */}
        {asesores.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-sales-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
              <User size={14} /> Asesores
            </label>
            <div className="space-y-1">
              {asesores.map(a => (
                <label key={a.id} className="flex items-center gap-2 text-sm text-sales-slate-300 hover:bg-sales-slate-800 p-1 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={currentFilters.vendorId === a.id}
                    onChange={(e) => {
                      onApply({ ...currentFilters, vendorId: e.target.checked ? a.id : '' });
                    }}
                    className="rounded bg-sales-slate-800 border-sales-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 truncate" title={a.name}>{a.name}</span>
                  <span className="text-xs text-sales-slate-500 bg-sales-slate-800 px-1.5 py-0.5 rounded border border-sales-slate-700">{a.count}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Cliente */}
        {clientes.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-sales-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
              <User size={14} /> Clientes (Resultados)
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {clientes.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-sales-slate-300 hover:bg-sales-slate-800 p-1 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={currentFilters.clientId === c.id}
                    onChange={(e) => {
                      onApply({ ...currentFilters, clientId: e.target.checked ? c.id : '' });
                    }}
                    className="rounded bg-sales-slate-800 border-sales-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 truncate" title={c.name}>{c.name}</span>
                  <span className="text-xs text-sales-slate-500 bg-sales-slate-800 px-1.5 py-0.5 rounded border border-sales-slate-700">{c.count}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* RFC / Razón Social */}
        {facets?.rfcs?.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-sales-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
              <Activity size={14} /> RFC / Razón Social
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {facets.rfcs.map(r => (
                <label key={r.id} className="flex items-center gap-2 text-sm text-sales-slate-300 hover:bg-sales-slate-800 p-1 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={currentFilters.rfc === r.id}
                    onChange={(e) => {
                      onApply({ ...currentFilters, rfc: e.target.checked ? r.id : '' });
                    }}
                    className="rounded bg-sales-slate-800 border-sales-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 truncate uppercase" title={r.name}>{r.name}</span>
                  <span className="text-xs text-sales-slate-500 bg-sales-slate-800 px-1.5 py-0.5 rounded border border-sales-slate-700">{r.count}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Fechas */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-sales-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Calendar size={14} /> Fechas
          </label>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-sales-slate-500 mb-1 block">Desde</span>
              <input 
                type="date" 
                value={currentFilters.dateFrom || ''}
                onChange={e => onApply({ ...currentFilters, dateFrom: e.target.value })}
                className="w-full px-2 py-1.5 border border-sales-slate-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-sales-slate-800 text-sales-slate-100"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <span className="text-xs text-sales-slate-500 mb-1 block">Hasta</span>
              <input 
                type="date" 
                value={currentFilters.dateTo || ''}
                onChange={e => onApply({ ...currentFilters, dateTo: e.target.value })}
                className="w-full px-2 py-1.5 border border-sales-slate-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-sales-slate-800 text-sales-slate-100"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
        </div>

      </div>

      <div className="p-4 border-t border-sales-slate-800 bg-sales-slate-900/60">
        <button 
          type="button"
          onClick={() => {
            onApply({ vendorId: '', clientId: '', rfc: '', dateFrom: '', dateTo: '', status: '' });
          }}
          className="w-full px-4 py-2 text-sm font-medium text-sales-slate-300 bg-sales-slate-800 border border-sales-slate-700 rounded-lg hover:bg-sales-slate-700 hover:text-sales-slate-100 transition-colors"
        >
          Limpiar Filtros
        </button>
      </div>
    </div>
  );
}
