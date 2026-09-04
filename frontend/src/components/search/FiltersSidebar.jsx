import React from 'react';
import { MessageSquare, User, ShoppingBag } from 'lucide-react';

export default function FiltersSidebar({ facets, loading, activeTypes, onFilterChange }) {
  const types = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, count: facets?.chats || 0 },
    { id: 'clients', label: 'Clientes', icon: User, count: facets?.clients || 0 },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag, count: facets?.orders || 0 },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Filtrar Por</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Categoría</h3>
          {loading && !facets ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-200 animate-pulse rounded" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {types.map(t => {
                const isActive = activeTypes.includes(t.id);
                const disabled = t.count === 0 && !isActive;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    disabled={disabled}
                    onClick={() => onFilterChange('type', t.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : disabled 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                      {t.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
