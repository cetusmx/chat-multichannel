import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Clock } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';

export default function GlobalSearchInput() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { recentSearches, addSearchTerm, removeSearchTerm, clearHistory } = useSearchStore();

  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);

  // Sync with URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setInputValue(q);
    } else {
      setInputValue('');
    }
  }, [searchParams]);

  // Click outside to close history
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const term = inputValue.trim();
    if (!term) return;

    addSearchTerm(term);
    setIsFocused(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleClear = () => {
    setInputValue('');
  };

  const handleHistoryClick = (term) => {
    setInputValue(term);
    addSearchTerm(term);
    setIsFocused(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const showDropdown = isFocused && recentSearches.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <div className="relative flex items-center w-full">
          <div className="absolute left-3 text-gray-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Buscar chats, clientes o pedidos..."
            aria-label="Buscar en toda la aplicación"
            aria-expanded={showDropdown}
            aria-controls="history-dropdown-id"
            maxLength={100}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 text-gray-400 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div 
          id="history-dropdown-id" 
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1"
        >
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase">Búsquedas Recientes</span>
            <button 
              onMouseDown={(e) => { e.preventDefault(); clearHistory(); }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Borrar historial
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {recentSearches.map((term, idx) => (
              <li key={idx} className="flex justify-between items-center hover:bg-gray-50 px-4 py-2 cursor-pointer group">
                <div 
                  className="flex items-center gap-2 flex-grow"
                  onMouseDown={(e) => { e.preventDefault(); handleHistoryClick(term); }}
                >
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700">{term}</span>
                </div>
                <button
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeSearchTerm(term); }}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  aria-label={`Eliminar ${term} del historial`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
